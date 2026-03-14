/**
 * google-auth.js — Passport.js Google OAuth 2.0 strategy setup.
 * Configures how users sign in with Google and how their tokens are stored.
 * Tokens are stored in the session; the DB only holds a user ID.
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const config = require('../config');
const logger = require('../utils/logger');

function setupGoogleAuth(app) {
  // We use a session-only approach: the full user object (with tokens) is serialized into the session.
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) => {
        const user = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          geminiApiKey: null,
        };

        logger.info(`User authenticated: ${user.email}`);
        return done(null, user);
      }
    )
  );

  app.use(passport.initialize());
  app.use(passport.session());
}

module.exports = { setupGoogleAuth };
