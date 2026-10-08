import { Op } from 'sequelize';
import {
  BillingService,
  Invoice,
  InvoiceItem,
  Payment,
  Receipt,
  PaymentMode,
  Patient,
  User,
  Department,
  Appointment,
  Encounter,
  InvestigationOrder,
  Investigation,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  Medicine,
  HospitalSequence,
  HospitalSetting,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

// ==============================================================
// 1. CONCURRENCY-SAFE SEQUENCE GENERATORS
// ==============================================================

/**
 * Generate sequential, tenant-scoped invoice number
 * Format: INV-YYYY-000001
 */
export const generateNextInvoiceNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'INVOICE' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefix = await HospitalSetting.findOne({
      where: { hospitalId, key: 'invoice_prefix' },
      transaction: t,
    });

    const prefix = customPrefix?.value?.trim().toUpperCase() || 'INV';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'INVOICE',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'INVOICE' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

/**
 * Generate sequential, tenant-scoped payment number
 * Format: PAY-YYYY-000001
 */
export const generateNextPaymentNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'PAYMENT' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefix = await HospitalSetting.findOne({
      where: { hospitalId, key: 'payment_prefix' },
      transaction: t,
    });

    const prefix = customPrefix?.value?.trim().toUpperCase() || 'PAY';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'PAYMENT',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'PAYMENT' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

/**
 * Generate sequential, tenant-scoped receipt number
 * Format: REC-YYYY-000001
 */
export const generateNextReceiptNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'RECEIPT' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefix = await HospitalSetting.findOne({
      where: { hospitalId, key: 'receipt_prefix' },
      transaction: t,
    });

    const prefix = customPrefix?.value?.trim().toUpperCase() || 'REC';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'RECEIPT',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'RECEIPT' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

// ==============================================================
// 2. BILLABLE SERVICES MASTER
// ==============================================================

/**
 * Create a new billing service
 */
export const createBillingService = async (hospitalId, data, userId) => {
  const {
    serviceCode,
    serviceName,
    category = 'OTHER',
    description,
    departmentId,
    defaultPrice = 0,
    taxPercentage = 0,
    isActive = true,
  } = data;

  const normalizedCode = serviceCode.trim().toUpperCase();

  // Check code uniqueness per hospital
  const existing = await BillingService.findOne({
    where: { hospitalId, serviceCode: normalizedCode },
  });

  if (existing) {
    const error = new Error(`Billing service with code '${normalizedCode}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  if (departmentId) {
    const dept = await Department.findOne({ where: { id: departmentId, hospitalId } });
    if (!dept) {
      const error = new Error('Department not found in this hospital');
      error.statusCode = 404;
      throw error;
    }
  }

  const service = await BillingService.create({
    hospitalId,
    serviceCode: normalizedCode,
    serviceName: serviceName.trim(),
    category: category.trim().toUpperCase(),
    description: description ? description.trim() : null,
    departmentId: departmentId || null,
    defaultPrice: Number(defaultPrice) || 0,
    taxPercentage: Number(taxPercentage) || 0,
    isActive: Boolean(isActive),
    createdBy: userId,
    updatedBy: userId,
  });

  return service;
};

/**
 * Get billing services list with filters
 */
export const getBillingServices = async (hospitalId, query = {}) => {
  const { category, isActive, search, page = 1, limit = 50 } = query;
  const where = { hospitalId };

  if (category) {
    where.category = category.toUpperCase();
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { serviceCode: { [Op.iLike]: term } },
      { serviceName: { [Op.iLike]: term } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * pageLimit;

  const { count, rows } = await BillingService.findAndCountAll({
    where,
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
    ],
    order: [['serviceName', 'ASC']],
    limit: pageLimit,
    offset,
  });

  return {
    services: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Update billing service
 */
export const updateBillingService = async (hospitalId, serviceId, data, userId) => {
  const service = await BillingService.findOne({
    where: { id: serviceId, hospitalId },
  });

  if (!service) {
    const error = new Error('Billing service not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.serviceCode) {
    const normalizedCode = data.serviceCode.trim().toUpperCase();
    if (normalizedCode !== service.serviceCode) {
      const existing = await BillingService.findOne({
        where: { hospitalId, serviceCode: normalizedCode },
      });
      if (existing) {
        const error = new Error(`Billing service with code '${normalizedCode}' already exists`);
        error.statusCode = 409;
        throw error;
      }
      service.serviceCode = normalizedCode;
    }
  }

  if (data.serviceName !== undefined) service.serviceName = data.serviceName.trim();
  if (data.category !== undefined) service.category = data.category.trim().toUpperCase();
  if (data.description !== undefined) service.description = data.description ? data.description.trim() : null;
  if (data.defaultPrice !== undefined) service.defaultPrice = Number(data.defaultPrice) || 0;
  if (data.taxPercentage !== undefined) service.taxPercentage = Number(data.taxPercentage) || 0;
  if (data.isActive !== undefined) service.isActive = Boolean(data.isActive);
  if (data.departmentId !== undefined) service.departmentId = data.departmentId || null;

  service.updatedBy = userId;
  await service.save();

  return service;
};

// ==============================================================
// 3. INVOICE CREATION & TOTALS (AUTHORITATIVE SERVER-SIDE)
// ==============================================================

/**
 * Authoritatively calculate line items and totals
 */
export const calculateInvoiceTotals = (items, invoiceDiscount = 0) => {
  let subtotal = 0;
  let itemDiscounts = 0;
  let taxAmount = 0;

  const processedItems = items.map((item) => {
    const quantity = Math.max(0.01, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const lineDiscount = Math.max(0, Number(item.discountAmount) || 0);
    const taxRate = Math.max(0, Math.min(100, Number(item.taxPercentage) || 0));

    const lineBase = Number((quantity * unitPrice).toFixed(2));
    const effectiveDiscount = Math.min(lineBase, lineDiscount);
    const taxableAmount = lineBase - effectiveDiscount;
    const lineTax = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const lineTotal = Number((taxableAmount + lineTax).toFixed(2));

    subtotal += lineBase;
    itemDiscounts += effectiveDiscount;
    taxAmount += lineTax;

    return {
      billingServiceId: item.billingServiceId || null,
      description: item.description,
      quantity,
      unitPrice,
      discountAmount: effectiveDiscount,
      taxPercentage: taxRate,
      taxAmount: lineTax,
      lineTotal,
      sourceType: item.sourceType || 'OTHER',
      sourceId: item.sourceId || null,
    };
  });

  const parsedInvoiceDiscount = Math.max(0, Number(invoiceDiscount) || 0);
  const totalDiscount = Math.min(subtotal, Number((itemDiscounts + parsedInvoiceDiscount).toFixed(2)));
  const totalAmount = Math.max(0, Number((subtotal - totalDiscount + taxAmount).toFixed(2)));

  return {
    processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(totalDiscount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount,
  };
};

/**
 * Check for duplicate billing across clinical sources
 */
const checkDuplicateBilling = async (hospitalId, items, t) => {
  for (const item of items) {
    if (item.sourceType && item.sourceType !== 'OTHER' && item.sourceId) {
      const existing = await InvoiceItem.findOne({
        where: {
          hospitalId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        },
        include: [
          {
            model: Invoice,
            as: 'invoice',
            where: { status: { [Op.ne]: 'CANCELLED' } },
            required: true,
          },
        ],
        transaction: t,
      });

      if (existing) {
        const error = new Error(
          `Item for source ${item.sourceType} (${item.sourceId}) has already been billed on invoice ${existing.invoice.invoiceNumber}`
        );
        error.statusCode = 409;
        throw error;
      }
    }
  }
};

/**
 * Create an Invoice
 */
export const createInvoice = async (hospitalId, data, userId) => {
  return withTransaction(async (t) => {
    const {
      patientId,
      encounterId,
      appointmentId,
      items = [],
      discountAmount = 0,
      notes,
      status = 'ISSUED',
    } = data;

    if (!items || items.length === 0) {
      const error = new Error('Invoice must have at least one billable item');
      error.statusCode = 400;
      throw error;
    }

    // 1. Validate Patient
    const patient = await Patient.findOne({
      where: { id: patientId, hospitalId },
      transaction: t,
    });
    if (!patient) {
      const error = new Error('Patient not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate Encounter / Appointment if provided
    if (encounterId) {
      const encounter = await Encounter.findOne({
        where: { id: encounterId, hospitalId },
        transaction: t,
      });
      if (!encounter) {
        const error = new Error('Encounter not found in this hospital');
        error.statusCode = 404;
        throw error;
      }
    }

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        where: { id: appointmentId, hospitalId },
        transaction: t,
      });
      if (!appointment) {
        const error = new Error('Appointment not found in this hospital');
        error.statusCode = 404;
        throw error;
      }
    }

    // 3. Prevent duplicate source billing
    await checkDuplicateBilling(hospitalId, items, t);

    // 4. Authoritative totals calculation
    const {
      processedItems,
      subtotal,
      discountAmount: finalDiscount,
      taxAmount,
      totalAmount,
    } = calculateInvoiceTotals(items, discountAmount);

    // 5. Generate Invoice Number
    const invoiceNumber = await generateNextInvoiceNumber(hospitalId, t);

    // 6. Create Invoice
    const invoice = await Invoice.create(
      {
        hospitalId,
        invoiceNumber,
        patientId,
        encounterId: encounterId || null,
        appointmentId: appointmentId || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        subtotal,
        discountAmount: finalDiscount,
        taxAmount,
        totalAmount,
        paidAmount: 0.0,
        dueAmount: totalAmount,
        status: status === 'DRAFT' ? 'DRAFT' : 'ISSUED',
        paymentStatus: 'UNPAID',
        notes: notes ? notes.trim() : null,
        createdBy: userId,
        updatedBy: userId,
      },
      { transaction: t }
    );

    // 7. Create Line Items preserving historical unit price
    for (const item of processedItems) {
      await InvoiceItem.create(
        {
          hospitalId,
          invoiceId: invoice.id,
          billingServiceId: item.billingServiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxPercentage: item.taxPercentage,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          createdBy: userId,
        },
        { transaction: t }
      );
    }

    // Reload with items and associations
    const created = await Invoice.findByPk(invoice.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone'] },
      ],
      transaction: t,
    });

    return created;
  });
};

/**
 * Issue a draft invoice (transitions status to ISSUED, making items immutable)
 */
export const issueInvoice = async (hospitalId, invoiceId, userId) => {
  return withTransaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    if (invoice.status === 'CANCELLED') {
      const error = new Error('Cannot issue a cancelled invoice');
      error.statusCode = 400;
      throw error;
    }

    if (invoice.status === 'ISSUED') {
      return invoice;
    }

    await invoice.update(
      {
        status: 'ISSUED',
        updatedBy: userId,
      },
      { transaction: t }
    );

    return invoice;
  });
};

/**
 * Update an invoice (ONLY permitted if DRAFT; ISSUED invoices are financially immutable)
 */
export const updateInvoice = async (hospitalId, invoiceId, data, userId) => {
  return withTransaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    if (invoice.status === 'CANCELLED') {
      const error = new Error('Cannot edit a cancelled invoice');
      error.statusCode = 400;
      throw error;
    }

    if (invoice.status === 'ISSUED') {
      const error = new Error('Issued invoices are financially immutable. Use cancellation or adjustments instead.');
      error.statusCode = 400;
      throw error;
    }

    // Draft invoice editing allowed
    const { items, discountAmount = 0, notes } = data;

    if (items && items.length > 0) {
      // Delete old items
      await InvoiceItem.destroy({ where: { invoiceId: invoice.id }, transaction: t });

      // Check duplicates for new items
      await checkDuplicateBilling(hospitalId, items, t);

      // Recalculate
      const {
        processedItems,
        subtotal,
        discountAmount: finalDiscount,
        taxAmount,
        totalAmount,
      } = calculateInvoiceTotals(items, discountAmount);

      for (const item of processedItems) {
        await InvoiceItem.create(
          {
            hospitalId,
            invoiceId: invoice.id,
            billingServiceId: item.billingServiceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxPercentage: item.taxPercentage,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      await invoice.update(
        {
          subtotal,
          discountAmount: finalDiscount,
          taxAmount,
          totalAmount,
          dueAmount: totalAmount,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : invoice.notes,
          updatedBy: userId,
        },
        { transaction: t }
      );
    } else if (notes !== undefined) {
      await invoice.update({ notes: notes ? notes.trim() : null, updatedBy: userId }, { transaction: t });
    }

    const updated = await Invoice.findByPk(invoice.id, {
      include: [{ model: InvoiceItem, as: 'items' }],
      transaction: t,
    });

    return updated;
  });
};

/**
 * Cancel an invoice (mandatory reason, no successful payments allowed)
 */
export const cancelInvoice = async (hospitalId, invoiceId, { cancellationReason }, userId) => {
  return withTransaction(async (t) => {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    if (invoice.status === 'CANCELLED') {
      const error = new Error('Invoice is already cancelled');
      error.statusCode = 400;
      throw error;
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      const error = new Error('Cancellation reason is mandatory');
      error.statusCode = 400;
      throw error;
    }

    // Check payments
    if (Number(invoice.paidAmount) > 0) {
      const error = new Error('Cannot cancel invoice with recorded payments. Please refund all payments first.');
      error.statusCode = 400;
      throw error;
    }

    const existingPayments = await Payment.count({
      where: { invoiceId, hospitalId, status: 'SUCCESS' },
      transaction: t,
    });

    if (existingPayments > 0) {
      const error = new Error('Cannot cancel invoice with active payments');
      error.statusCode = 400;
      throw error;
    }

    await invoice.update(
      {
        status: 'CANCELLED',
        cancellationReason: cancellationReason.trim(),
        cancelledAt: new Date(),
        cancelledBy: userId,
        updatedBy: userId,
      },
      { transaction: t }
    );

    return invoice;
  });
};

// ==============================================================
// 4. INVOICE QUERIES & DETAILS
// ==============================================================

/**
 * Get Invoices List with search and filters
 */
export const getInvoices = async (hospitalId, query = {}) => {
  const {
    search,
    status,
    paymentStatus,
    patientId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;

  const where = { hospitalId };

  if (status) {
    where.status = status;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (patientId) {
    where.patientId = patientId;
  }

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) {
      where.invoiceDate[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.invoiceDate[Op.lte] = end;
    }
  }

  const patientWhere = {};
  if (search) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { invoiceNumber: { [Op.iLike]: term } },
    ];
    patientWhere[Op.or] = [
      { firstName: { [Op.iLike]: term } },
      { lastName: { [Op.iLike]: term } },
      { uhid: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageLimit;

  // If patient search criteria exists, use patient include with or condition
  const include = [
    {
      model: Patient,
      as: 'patient',
      attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender'],
      where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined,
      required: Object.keys(patientWhere).length > 0,
    },
    {
      model: InvoiceItem,
      as: 'items',
      attributes: ['id', 'description', 'quantity', 'unitPrice', 'lineTotal'],
    },
  ];

  const { count, rows } = await Invoice.findAndCountAll({
    where,
    include,
    order: [['invoiceDate', 'DESC'], ['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
    distinct: true,
  });

  return {
    invoices: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Get Single Invoice Details with items, payments, receipts, and clinical references
 */
export const getInvoiceById = async (hospitalId, invoiceId) => {
  const invoice = await Invoice.findOne({
    where: { id: invoiceId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'address'],
      },
      {
        model: InvoiceItem,
        as: 'items',
        include: [
          {
            model: BillingService,
            as: 'billingService',
            attributes: ['id', 'serviceCode', 'serviceName', 'category'],
          },
        ],
      },
      {
        model: Payment,
        as: 'payments',
        include: [
          { model: PaymentMode, as: 'paymentMode', attributes: ['id', 'name', 'code'] },
          { model: User, as: 'receiver', attributes: ['id', 'name'] },
          { model: Receipt, as: 'receipt' },
        ],
      },
      {
        model: Receipt,
        as: 'receipts',
        include: [{ model: User, as: 'generator', attributes: ['id', 'name'] }],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'startedAt'],
      },
      {
        model: Appointment,
        as: 'appointment',
        attributes: ['id', 'appointmentNumber', 'appointmentDate'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'canceller',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!invoice) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }

  return invoice;
};

// ==============================================================
// 5. PAYMENT COLLECTION, CONCURRENCY LOCKING & RECEIPTS
// ==============================================================

/**
 * Collect Payment with row-locking and automatic receipt generation
 */
export const collectPayment = async (hospitalId, invoiceId, data, userId) => {
  return withTransaction(async (t) => {
    const {
      amount,
      paymentModeId,
      transactionReference,
      paymentDate = new Date(),
      notes,
    } = data;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      const error = new Error('Payment amount must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    // 1. Database Row Locking on Invoice to prevent concurrent race conditions
    // Note: Query without joins to prevent Postgres 'FOR UPDATE cannot be applied to outer join' error
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    if (invoice.status === 'CANCELLED') {
      const error = new Error('Cannot collect payment for a cancelled invoice');
      error.statusCode = 400;
      throw error;
    }

    // 2. Authoritatively calculate current outstanding amount from existing payments
    const successfulPayments = await Payment.findAll({
      where: {
        invoiceId: invoice.id,
        hospitalId,
        status: { [Op.in]: ['SUCCESS', 'PARTIALLY_REFUNDED'] },
      },
      transaction: t,
    });

    const totalPaidSoFar = successfulPayments.reduce(
      (acc, p) => acc + (Number(p.amount) - Number(p.refundedAmount || 0)),
      0
    );

    const authoritativeDue = Number(
      (Number(invoice.totalAmount) - totalPaidSoFar).toFixed(2)
    );

    // 3. Overpayment rejection
    if (parsedAmount > authoritativeDue + 0.001) {
      const error = new Error(
        `Payment amount (₹${parsedAmount}) exceeds authoritative outstanding balance (₹${authoritativeDue})`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Validate PaymentMode if provided
    if (paymentModeId) {
      const mode = await PaymentMode.findOne({
        where: { id: paymentModeId, hospitalId },
        transaction: t,
      });
      if (!mode) {
        const error = new Error('Payment mode not found in this hospital');
        error.statusCode = 404;
        throw error;
      }
    }

    // 5. Generate Payment Number
    const paymentNumber = await generateNextPaymentNumber(hospitalId, t);

    // 6. Create Payment Record
    const payment = await Payment.create(
      {
        hospitalId,
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        paymentNumber,
        paymentModeId: paymentModeId || null,
        amount: parsedAmount,
        transactionReference: transactionReference ? transactionReference.trim() : null,
        paymentDate: new Date(paymentDate),
        status: 'SUCCESS',
        refundedAmount: 0.0,
        receivedBy: userId,
        notes: notes ? notes.trim() : null,
        createdBy: userId,
        updatedBy: userId,
      },
      { transaction: t }
    );

    // 7. Update Invoice Paid & Due amounts
    const newTotalPaid = Number((totalPaidSoFar + parsedAmount).toFixed(2));
    const newDue = Math.max(0, Number((Number(invoice.totalAmount) - newTotalPaid).toFixed(2)));

    let paymentStatus = 'PARTIALLY_PAID';
    if (newDue <= 0.001) {
      paymentStatus = 'PAID';
    }

    await invoice.update(
      {
        paidAmount: newTotalPaid,
        dueAmount: newDue,
        paymentStatus,
        status: 'ISSUED', // Automatically ensure status is ISSUED on payment
        updatedBy: userId,
      },
      { transaction: t }
    );

    // 8. Generate Receipt Number and create Receipt
    const receiptNumber = await generateNextReceiptNumber(hospitalId, t);

    const receipt = await Receipt.create(
      {
        hospitalId,
        receiptNumber,
        paymentId: payment.id,
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        receiptDate: new Date(paymentDate),
        amount: parsedAmount,
        generatedBy: userId,
        notes: notes ? notes.trim() : null,
      },
      { transaction: t }
    );

    return {
      payment,
      receipt,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: newTotalPaid,
        dueAmount: newDue,
        paymentStatus,
        status: invoice.status,
      },
    };
  });
};

/**
 * Refund a Payment (Full or Partial)
 */
export const refundPayment = async (hospitalId, paymentId, data, userId) => {
  return withTransaction(async (t) => {
    const { amount, reason } = data;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      const error = new Error('Refund amount must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    // Lock payment and invoice
    const payment = await Payment.findOne({
      where: { id: paymentId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!payment) {
      const error = new Error('Payment not found');
      error.statusCode = 404;
      throw error;
    }

    if (!['SUCCESS', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      const error = new Error(`Payment cannot be refunded in status ${payment.status}`);
      error.statusCode = 400;
      throw error;
    }

    const currentRefunded = Number(payment.refundedAmount || 0);
    const availableToRefund = Number((Number(payment.amount) - currentRefunded).toFixed(2));

    if (parsedAmount > availableToRefund + 0.001) {
      const error = new Error(
        `Refund amount (₹${parsedAmount}) exceeds refundable balance (₹${availableToRefund})`
      );
      error.statusCode = 400;
      throw error;
    }

    // Lock Invoice
    const invoice = await Invoice.findOne({
      where: { id: payment.invoiceId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const newPaymentRefunded = Number((currentRefunded + parsedAmount).toFixed(2));
    const newPaymentStatus = newPaymentRefunded >= Number(payment.amount) - 0.001
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';

    await payment.update(
      {
        refundedAmount: newPaymentRefunded,
        status: newPaymentStatus,
        notes: reason ? `${payment.notes || ''} [Refund: ${reason}]`.trim() : payment.notes,
        updatedBy: userId,
      },
      { transaction: t }
    );

    // Update invoice
    const newInvoicePaid = Math.max(0, Number((Number(invoice.paidAmount) - parsedAmount).toFixed(2)));
    const newInvoiceDue = Math.max(0, Number((Number(invoice.totalAmount) - newInvoicePaid).toFixed(2)));

    let newInvoicePaymentStatus = 'PARTIALLY_REFUNDED';
    if (newInvoicePaid <= 0.001) {
      newInvoicePaymentStatus = 'REFUNDED';
    } else if (newInvoiceDue <= 0.001) {
      newInvoicePaymentStatus = 'PAID';
    } else {
      newInvoicePaymentStatus = 'PARTIALLY_PAID';
    }

    await invoice.update(
      {
        paidAmount: newInvoicePaid,
        dueAmount: newInvoiceDue,
        paymentStatus: newInvoicePaymentStatus,
        updatedBy: userId,
      },
      { transaction: t }
    );

    return {
      payment,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paidAmount: newInvoicePaid,
        dueAmount: newInvoiceDue,
        paymentStatus: newInvoicePaymentStatus,
      },
    };
  });
};

/**
 * Get Single Payment Details
 */
export const getPaymentById = async (hospitalId, paymentId) => {
  const payment = await Payment.findOne({
    where: { id: paymentId, hospitalId },
    include: [
      { model: PaymentMode, as: 'paymentMode' },
      { model: User, as: 'receiver', attributes: ['id', 'name'] },
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone'] },
      { model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'totalAmount', 'dueAmount', 'paymentStatus'] },
      { model: Receipt, as: 'receipt' },
    ],
  });

  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

/**
 * Get Single Receipt Details
 */
export const getReceiptById = async (hospitalId, receiptId) => {
  const receipt = await Receipt.findOne({
    where: { id: receiptId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'address'],
      },
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['id', 'invoiceNumber', 'invoiceDate', 'totalAmount', 'paidAmount', 'dueAmount'],
      },
      {
        model: Payment,
        as: 'payment',
        include: [
          { model: PaymentMode, as: 'paymentMode', attributes: ['id', 'name', 'code'] },
          { model: User, as: 'receiver', attributes: ['id', 'name'] },
        ],
      },
      {
        model: User,
        as: 'generator',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!receipt) {
    const error = new Error('Receipt not found');
    error.statusCode = 404;
    throw error;
  }

  return receipt;
};

// ==============================================================
// 6. DASHBOARD METRICS & FINANCIAL HISTORY
// ==============================================================

/**
 * Get Billing Dashboard Metrics
 */
export const getBillingDashboardMetrics = async (hospitalId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Today's payments (SUCCESS or PARTIALLY_REFUNDED)
  const todayPayments = await Payment.findAll({
    where: {
      hospitalId,
      status: { [Op.in]: ['SUCCESS', 'PARTIALLY_REFUNDED'] },
      paymentDate: { [Op.between]: [todayStart, todayEnd] },
    },
    attributes: ['amount', 'refundedAmount', 'paymentModeId'],
  });

  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + (Number(p.amount) - Number(p.refundedAmount || 0)),
    0
  );

  // 2. Today's Invoices Count
  const todayInvoicesCount = await Invoice.count({
    where: {
      hospitalId,
      invoiceDate: { [Op.between]: [todayStart, todayEnd] },
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  // 3. Outstanding Amount (All active invoices)
  const activeInvoices = await Invoice.findAll({
    where: {
      hospitalId,
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['totalAmount', 'paidAmount', 'dueAmount', 'paymentStatus'],
  });

  const totalOutstanding = activeInvoices.reduce((sum, inv) => sum + Number(inv.dueAmount), 0);
  const unpaidInvoicesCount = activeInvoices.filter((inv) => inv.paymentStatus === 'UNPAID').length;
  const partialPaymentsCount = activeInvoices.filter((inv) => inv.paymentStatus === 'PARTIALLY_PAID').length;

  // 4. Cancelled Invoices Count
  const cancelledInvoicesCount = await Invoice.count({
    where: { hospitalId, status: 'CANCELLED' },
  });

  // 5. Recent Invoices
  const recentInvoices = await Invoice.findAll({
    where: { hospitalId },
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  // 6. Recent Payments
  const recentPayments = await Payment.findAll({
    where: { hospitalId },
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
      { model: PaymentMode, as: 'paymentMode', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  // 7. Payment Mode Breakdown
  const paymentModes = await PaymentMode.findAll({
    where: { hospitalId },
    attributes: ['id', 'name'],
  });

  const modeMap = {};
  paymentModes.forEach((m) => {
    modeMap[m.id] = { name: m.name, count: 0, total: 0 };
  });

  todayPayments.forEach((p) => {
    if (p.paymentModeId && modeMap[p.paymentModeId]) {
      modeMap[p.paymentModeId].count += 1;
      modeMap[p.paymentModeId].total += Number(p.amount) - Number(p.refundedAmount || 0);
    }
  });

  return {
    todayRevenue: Number(todayRevenue.toFixed(2)),
    todayInvoicesCount,
    todayPaymentsCount: todayPayments.length,
    totalOutstanding: Number(totalOutstanding.toFixed(2)),
    unpaidInvoicesCount,
    partialPaymentsCount,
    cancelledInvoicesCount,
    recentInvoices,
    recentPayments,
    paymentModeBreakdown: Object.values(modeMap),
  };
};

/**
 * Get Patient Financial History
 */
export const getPatientFinancialHistory = async (hospitalId, patientId) => {
  const patient = await Patient.findOne({
    where: { id: patientId, hospitalId },
    attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender'],
  });

  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  // All Invoices
  const invoices = await Invoice.findAll({
    where: { hospitalId, patientId },
    include: [
      { model: InvoiceItem, as: 'items' },
      { model: Payment, as: 'payments', include: [{ model: PaymentMode, as: 'paymentMode', attributes: ['name'] }] },
    ],
    order: [['invoiceDate', 'DESC']],
  });

  // All Receipts
  const receipts = await Receipt.findAll({
    where: { hospitalId, patientId },
    include: [
      { model: Payment, as: 'payment', include: [{ model: PaymentMode, as: 'paymentMode', attributes: ['name'] }] },
      { model: Invoice, as: 'invoice', attributes: ['invoiceNumber'] },
    ],
    order: [['receiptDate', 'DESC']],
  });

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  invoices.forEach((inv) => {
    if (inv.status !== 'CANCELLED') {
      totalBilled += Number(inv.totalAmount);
      totalPaid += Number(inv.paidAmount);
      totalOutstanding += Number(inv.dueAmount);
    }
  });

  return {
    patient,
    summary: {
      totalBilled: Number(totalBilled.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      invoiceCount: invoices.length,
      receiptCount: receipts.length,
    },
    invoices,
    receipts,
  };
};

/**
 * Helper: Find Unbilled Clinical Items for a Patient
 * Checks appointments, completed investigations, and dispensing records not yet billed
 */
export const getUnbilledItemsForPatient = async (hospitalId, patientId) => {
  // 1. Unbilled Appointments
  const billedApptIds = (
    await InvoiceItem.findAll({
      where: { hospitalId, sourceType: 'APPOINTMENT' },
      attributes: ['sourceId'],
      include: [{ model: Invoice, as: 'invoice', where: { status: { [Op.ne]: 'CANCELLED' } } }],
    })
  ).map((i) => i.sourceId);

  const appointments = await Appointment.findAll({
    where: {
      hospitalId,
      patientId,
      status: { [Op.in]: ['COMPLETED', 'CONFIRMED'] },
      id: { [Op.notIn]: billedApptIds.length > 0 ? billedApptIds : ['00000000-0000-0000-0000-000000000000'] },
    },
    include: [
      { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization', 'consultationFee'] },
    ],
  });

  // 2. Unbilled Finalized Investigation Orders
  const billedInvIds = (
    await InvoiceItem.findAll({
      where: { hospitalId, sourceType: 'INVESTIGATION' },
      attributes: ['sourceId'],
      include: [{ model: Invoice, as: 'invoice', where: { status: { [Op.ne]: 'CANCELLED' } } }],
    })
  ).map((i) => i.sourceId);

  const investigationOrders = await InvestigationOrder.findAll({
    where: {
      hospitalId,
      patientId,
      status: 'FINALIZED',
      id: { [Op.notIn]: billedInvIds.length > 0 ? billedInvIds : ['00000000-0000-0000-0000-000000000000'] },
    },
    include: [
      { model: Investigation, as: 'investigation', attributes: ['id', 'name', 'code', 'defaultCharge'] },
    ],
  });

  // 3. Unbilled Pharmacy Dispensing
  const billedDispIds = (
    await InvoiceItem.findAll({
      where: { hospitalId, sourceType: 'PHARMACY' },
      attributes: ['sourceId'],
      include: [{ model: Invoice, as: 'invoice', where: { status: { [Op.ne]: 'CANCELLED' } } }],
    })
  ).map((i) => i.sourceId);

  const dispensings = await PrescriptionDispensing.findAll({
    where: {
      hospitalId,
      patientId,
      status: { [Op.in]: ['FULLY_DISPENSED', 'PARTIALLY_DISPENSED'] },
      id: { [Op.notIn]: billedDispIds.length > 0 ? billedDispIds : ['00000000-0000-0000-0000-000000000000'] },
    },
    include: [
      {
        model: PrescriptionDispensingItem,
        as: 'items',
        include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name'] }],
      },
    ],
  });

  return {
    appointments,
    investigationOrders,
    dispensings,
  };
};

export default {
  generateNextInvoiceNumber,
  generateNextPaymentNumber,
  generateNextReceiptNumber,
  createBillingService,
  getBillingServices,
  updateBillingService,
  calculateInvoiceTotals,
  createInvoice,
  issueInvoice,
  updateInvoice,
  cancelInvoice,
  getInvoices,
  getInvoiceById,
  collectPayment,
  refundPayment,
  getPaymentById,
  getReceiptById,
  getBillingDashboardMetrics,
  getPatientFinancialHistory,
  getUnbilledItemsForPatient,
};
