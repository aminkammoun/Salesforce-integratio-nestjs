import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Orders extends Document {

  // ===== Core References =====
  @Prop({ required: true, unique: true })
  wcs_crm_reference_id: string;

  @Prop({ required: true })
  order_id: number;

  @Prop({ required: true })
  status: string;

  // ===== Payment =====
  @Prop({ required: true })
  payment_method: string; // stripe

  @Prop()
  payment_title: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  total: number;

  @Prop()
  transaction_id: string;

  // ===== Customer =====
  @Prop()
  customer_id: number;

  @Prop({ required: true })
  billing_email: string;

  @Prop()
  billing_phone?: string;

  // ===== Addresses =====
  @Prop()
  billing_address_index: string;

  @Prop()
  shipping_address_index: string;

  // ===== Stripe Details =====
  @Prop({
    type: {
      captured: String,
      currency: String,
      customer_id: String,
      fee: Number,
      net: Number,
      intent_id: String,
      source_id: String,
      payment_type: String,
    },
  })
  stripe: {
    captured: string;
    currency: string;
    customer_id: string;
    fee: number;
    net: number;
    intent_id: string;
    source_id: string;
    payment_type: string;
  };

  // ===== Hashes =====
  @Prop()
  coupons_hash: string;

  @Prop()
  fees_hash: string;

  @Prop()
  shipping_hash: string;

  @Prop()
  taxes_hash: string;

  // ===== Attribution (WooCommerce) =====
  @Prop({
    type: {
      device_type: String,
      referrer: String,
      session_count: Number,
      session_entry: String,
      session_pages: Number,
      session_start_time: Date,
      source_type: String,
      user_agent: String,
      utm_content: String,
      utm_medium: String,
      utm_source: String,
    },
  })
  attribution: {
    device_type: string;
    referrer: string;
    session_count: number;
    session_entry: string;
    session_pages: number;
    session_start_time: Date;
    source_type: string;
    user_agent: string;
    utm_content: string;
    utm_medium: string;
    utm_source: string;
  };

  // ===== Tax =====
  @Prop({ default: false })
  is_vat_exempt: boolean;

  // ===== Order Date =====
  @Prop({ required: true })
  created: Date;
}

export const OrdersSchema = SchemaFactory.createForClass(Orders);
