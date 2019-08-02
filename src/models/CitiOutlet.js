import mongoose from 'mongoose';

const { Schema } = mongoose;

const citiOutletSchema = new Schema({
  outletId: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  address: {
    type: String
  },
  telephone: {
    type: String
  },
  link: {
    type: String
  },
  details: {
    type: String
  },
  discountPercent: {
    type: Number
  },
  returnVoucherAmount: {
    type: Number
  },
  hasFreeStuff: {
    type: Boolean
  },
  isOneForOne: {
    type: Boolean
  },
  dateExpiry: {
    type: Date
  },
  imgUrls: {
    type: [String],
    required: true,
    default: []
  },
  tos: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    required: true,
    default: []
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  location: {
    type: { type: String },
    coordinates: [Number]
  }
});

// This will add `id` in toJSON
citiOutletSchema.set('toJSON', {
  virtuals: true
});

citiOutletSchema.index({ location: '2dsphere' });

export default mongoose.model('CitiOutlet', citiOutletSchema);
