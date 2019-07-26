import mongoose from 'mongoose';

const { Schema } = mongoose;

const chopeOutletSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  outletId: {
    unique: true,
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    required: true
  },
  images: {
    type: [String],
    required: true,
    default: []
  },
  loc: {
    type: [Number],
    required: true
  },
  maxPax: {
    type: Number
  },
  daysExpiry: {
    type: Number
  },
  minPrice: {
    type: Number,
    required: true
  },
  maxPrice: {
    type: Number,
    required: true
  },
  maxDiscount: {
    type: Number,
    required: true
  },
  offers: [
    new Schema({
      dayStart: {
        type: Number,
        required: true
      },
      dayEnd: {
        type: Number,
        required: true
      },
      timeStart: {
        type: String,
        required: true
      },
      timeEnd: {
        type: String,
        required: true
      },
      isAvailable: {
        type: Boolean,
        required: true
      },
      usualPrice: {
        type: Number,
        required: true
      },
      offerPrice: {
        type: Number,
        required: true
      },
      percentOff: {
        type: Number,
        required: true
      }
    })
  ],
  availableOffers: [
    new Schema({
      dayStart: {
        type: Number,
        required: true
      },
      dayEnd: {
        type: Number,
        required: true
      },
      timeStart: {
        type: String,
        required: true
      },
      timeEnd: {
        type: String,
        required: true
      },
      isAvailable: {
        type: Boolean,
        required: true
      },
      usualPrice: {
        type: Number,
        required: true
      },
      offerPrice: {
        type: Number,
        required: true
      },
      percentOff: {
        type: Number,
        required: true
      }
    })
  ],

  tos: {
    type: [String]
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
});

// This will add `id` in toJSON
chopeOutletSchema.set('toJSON', {
  virtuals: true
});

chopeOutletSchema.index({ location: '2dsphere' });

export default mongoose.model('ChopeOutlet', chopeOutletSchema);
