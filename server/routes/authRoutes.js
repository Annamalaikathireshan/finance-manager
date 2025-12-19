const passport = require('passport');

module.exports = app => {
    app.get(
        '/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })
    );

    app.get(
        '/auth/google/callback',
        passport.authenticate('google'),
        (req, res) => {
            const redirectUrl = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:4200';
            res.redirect(redirectUrl);
        }
    );

    app.get('/api/logout', (req, res, next) => {
        req.logout(err => {
            if (err) {
                return next(err);
            }
            const redirectUrl = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:4200';
            res.redirect(redirectUrl);
        });
    });

    app.get('/api/current_user', (req, res) => {
        res.send(req.user);
    });
};
