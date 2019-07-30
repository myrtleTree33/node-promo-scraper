import mongoose from 'mongoose';
import uuidv1 from 'uuid/v1';

const { Schema } = mongoose;

const matchedOutletSchema = new Schema({
  outletId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv1
  },
  titles: {
    type: [String],
    required: true,
    default: []
  },
  dateAdded: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    required: true
  },
  location: {
    type: { type: String },
    coordinates: [Number]
  },
  address: {
    type: String
  },
  telephone: {
    type: String
  },
  imgUrls: {
    type: [String]
  },
  providers: [
    new Schema({
      provider: {
        type: String,
        required: true
      },
      outletId: {
        type: String,
        required: true
      },
      link: {
        type: String,
        required: true
      },
      hasPromo: {
        type: Boolean,
        default: false,
        required: true
      }
    })
  ]
});

// This will add `id` in toJSON
matchedOutletSchema.set('toJSON', {
  virtuals: true
});

matchedOutletSchema.index({ location: '2dsphere' });

export default mongoose.model('MatchedOutlet', matchedOutletSchema);
