import mongoose, { Schema, Model } from 'mongoose'

export type InventoryReason =
  | 'order_placed'
  | 'order_cancelled'
  | 'order_refunded'
  | 'manual_adjustment'
  | 'restock'
  | 'rollback'
  | 'expiry_removal'
  | 'system_correction'

export interface IInventoryLog {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  productName: string
  variantSku: string
  variantLabel: string
  delta: number           // positive = added, negative = removed
  quantityBefore: number
  quantityAfter: number
  reason: InventoryReason
  orderId?: mongoose.Types.ObjectId
  adminId?: mongoose.Types.ObjectId
  note?: string
  createdAt: Date
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    productId:     { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName:   { type: String, required: true },
    variantSku:    { type: String, required: true, index: true },
    variantLabel:  { type: String, required: true },
    delta:         { type: Number, required: true },
    quantityBefore:{ type: Number, required: true, min: 0 },
    quantityAfter: { type: Number, required: true, min: 0 },
    reason:        {
      type: String,
      required: true,
      enum: ['order_placed','order_cancelled','order_refunded','manual_adjustment','restock','rollback','expiry_removal','system_correction'],
      index: true,
    },
    orderId:  { type: Schema.Types.ObjectId, ref: 'Order'  },
    adminId:  { type: Schema.Types.ObjectId, ref: 'User'   },
    note:     { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
)

InventoryLogSchema.index({ productId: 1, createdAt: -1 })
InventoryLogSchema.index({ orderId: 1, createdAt: -1 }, { sparse: true })
InventoryLogSchema.index({ adminId: 1, createdAt: -1 }, { sparse: true })
InventoryLogSchema.index({ createdAt: -1 })

const InventoryLog: Model<IInventoryLog> =
  mongoose.models.InventoryLog ||
  mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema)

export default InventoryLog
