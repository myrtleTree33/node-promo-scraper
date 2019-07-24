import mongoose from 'mongoose';

const { Schema } = mongoose;

const burppleOutletSchema = new Schema({
  outletId: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  imgUrls: {
    type: [String]
  },
  numReviews: {
    type: Number
  },
  price: {
    type: Number
  },
  categories: {
    type: [String]
  },
  hasBeyond: {
    type: Boolean
  },
  genericLoc: {
    type: String
  },
  link: {
    type: String
  },

  dateAdded: {
    type: Date,
    default: Date.now
  },

  // See https://stackoverflow.com/questions/32199658/create-find-geolocation-in-mongoose
  location: {
    type: { type: String },
    coordinates: [Number]
  },
  address: {
    type: String
  }
});

// This will add `id` in toJSON
burppleOutletSchema.set('toJSON', {
  virtuals: true
});

function retrieveNearest({ maxPrice, minPrice = 0, coordinates, maxDistance }) {
  return this.find({
    $and: [
      { price: { $lte: maxPrice } },
      { price: { $gte: minPrice } },
      {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $minDistance: 0,
            $maxDistance: maxDistance
          }
        }
      }
    ]
  });
}

burppleOutletSchema.statics.retrieveNearest = retrieveNearest;

function retrieveNearestBurpple({ maxPrice, minPrice = 0, coordinates, maxDistance }) {
  return this.find({
    $and: [
      { hasBeyond: false },
      { price: { $lte: maxPrice } },
      { price: { $gte: minPrice } },
      {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $minDistance: 0,
            $maxDistance: maxDistance
          }
        }
      }
    ]
  });
}

function retrieveNearestBeyond({ maxPrice, minPrice = 0, coordinates, maxDistance }) {
  const [maxPrice2, minPrice2] = [maxPrice * 2, minPrice * 2];

  return this.find({
    $and: [
      { hasBeyond: true },
      { price: { $lte: maxPrice2 } },
      { price: { $gte: minPrice2 } },
      {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $minDistance: 0,
            $maxDistance: maxDistance
          }
        }
      }
    ]
  });
}

burppleOutletSchema.statics.retrieveNearestBeyond = retrieveNearestBeyond;
burppleOutletSchema.statics.retrieveNearestBurpple = retrieveNearestBurpple;

burppleOutletSchema.index({ location: '2dsphere' });

export default mongoose.model('BurppleOutlet', burppleOutletSchema);
