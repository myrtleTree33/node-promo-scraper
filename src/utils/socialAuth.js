import passport from 'passport';
import { Strategy as GoogleTokenStrategy } from 'passport-google-token';
import FacebookTokenStrategy from 'passport-facebook-token';
import LocalStrategy from 'passport-local';
import passportJwt from 'passport-jwt';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';

import logger from '../logger';
import User from '../models/User';

const { AUTH_JWT_SECRET, AUTH_JWT_AUDIENCE, AUTH_JWT_ISSUER, AUTH_JWT_EXPIRY } = process.env;

const generateAccessToken = userId => {
  const secret = AUTH_JWT_SECRET;
  const token = jwt.sign({}, secret, {
    expiresIn: AUTH_JWT_EXPIRY,
    audience: AUTH_JWT_AUDIENCE,
    issuer: AUTH_JWT_ISSUER,
    subject: userId.toString()
  });
  return token;
};

/**
 * Initializes passport using server-based storage (sessions)
 *
 * @param {*} app
 */
const initCore = app => {
  app.use(passport.initialize());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
  // Get the JWT from the "Authorization" header.
  // By default this looks for a "JWT " prefix
  const jwtToken = passportJwt.ExtractJwt.fromAuthHeaderWithScheme('jwt');
  // set JWT options
  const jwtOptions = {
    jwtFromRequest: jwtToken,
    secretOrKey: AUTH_JWT_SECRET,
    issuer: AUTH_JWT_ISSUER,
    audience: AUTH_JWT_AUDIENCE
  };

  passport.use(
    new passportJwt.Strategy(jwtOptions, (payload, done) => {
      const userId = payload.sub;
      User.findById(userId)
        .then(user => done(null, user, payload))
        .catch(err => done(err));
    })
  );
};

function initClassicLogin(app) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        session: false
      },
      (username, password, done) => {
        User.findOne({ email: username })
          .select('+passwordHash')
          .exec((err, user) => {
            if (err) {
              return done(err);
            }
            if (!user) {
              return done(null, false);
            }

            // verify password here
            const { passwordHash } = user;
            if (!bcrypt.compareSync(password, passwordHash)) {
              return done(null, false);
            }
            return done(null, user);
          });
      }
    )
  );

  app.post('/auth/classic/token', passport.authenticate('local'), (req, res) => {
    const { user } = req;
    const u = user.toJSON();
    u.social = null;
    delete u.passwordHash;
    const token = generateAccessToken(u.id);
    return res.json({ token, user: u });
  });

  app.post('/auth/classic/new', (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;
    const passwordHash = bcrypt.hashSync(password, 10);
    new User({
      email,
      passwordHash,
      details: {
        firstName,
        lastName
      },
      social: null
    }).save((err, user) => {
      if (err) {
        return next(createError(400, 'Error creating user'));
      }
      const u = user.toObject();
      delete u.passwordHash;
      u.social = null;
      return res.json({ user: u });
    });
  });

  logger.info('Initiated Classic login auth!');
}

/**
 * Initializes Google auth strategy.  This assumes you have a Google token.
 *
 * @param {Object} app
 */
function initGoogleToken(app) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  passport.use(
    new GoogleTokenStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET
      },
      (accessToken, refreshToken, profile, next) => {
        console.log(`Access token=${accessToken}`);
        console.log(`Refresh token=${refreshToken}`);
        User.upsertGoogleUser(accessToken, refreshToken, profile)
          .then(user => next(null, user))
          .catch(err => next(createError(400, 'Error upserting Google user')));
      }
    )
  );

  app.post('/auth/google/token', passport.authenticate('google-token'), (req, res) => {
    const { user } = req;
    const token = generateAccessToken(user._id);
    return res.json({ token, user: user.toJSON() });
  });

  logger.info('Initiated Google token login auth!');
}

/**
 * Initializes Facebook auth strategy.  This assumes you have a Google token.
 *
 * @param {*} app
 */
const initFacebookToken = app => {
  const { FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET } = process.env;
  passport.use(
    new FacebookTokenStrategy(
      {
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET
      },
      (accessToken, refreshToken, profile, next) => {
        User.upsertFacebookUser(accessToken, refreshToken, profile)
          .then(user => next(null, user))
          .catch(err => next(createError(400, 'Error upserting Facebook user')));
      }
    )
  );

  app.post('/auth/facebook/token', passport.authenticate('facebook-token'), (req, res) => {
    const { user } = req;
    const token = generateAccessToken(user._id);
    return res.json({ token, user: user.toJSON() });
  });

  logger.info('Initiated Facebook token login auth!');
};

// -----------------------------------------------
// Public methods
// -----------------------------------------------

/**
 * Use this to protect endpoints which need authentication.
 */
export const ensureAuth = passport.authenticate('jwt', { session: false });

/**
 * Top-level function to bind social auth
 */
export const initPassport = app => {
  initCore(app);
  initClassicLogin(app);
  initGoogleToken(app);
  initFacebookToken(app);
};
