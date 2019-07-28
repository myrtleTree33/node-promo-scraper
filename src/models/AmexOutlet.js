import mongoose from 'mongoose';

const { Schema } = mongoose;

const amexOutletSchema = new Schema({
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
  imgUrl: {
    type: String
  },
  offers: [
    new Schema({
      minGuest: {
        type: Number,
        default: 0,
        required: true
      },
      maxGuest: {
        type: Number,
        default: 0,
        required: true
      },
      discount: {
        type: Number,
        default: 0,
        required: true
      }
    })
  ],
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
amexOutletSchema.set('toJSON', {
  virtuals: true
});

amexOutletSchema.index({ location: '2dsphere' });

export default mongoose.model('AmexOutlet', amexOutletSchema);
