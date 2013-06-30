from functools import wraps
from flask import session, request, Response, g
from done.models import User


def get_current_user():
    """Tries to get the current user from the session. Returns `False`
    if the user from the sessions is invalid, `None` if there is no user
    in the session and the user if there is a valid one."""
    if not session.get('user'):
        return None
    else:
        user = User.query.get(session.get('user'))
        if not user:
            return False
        return user


def set_current_user(user):
    session['user'] = user.id
    session.permanent = True


def auth_required(f):
    """Makes sure only authenticated user's get access to the API."""

    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()

        # if there is no user, try to authenticate with given data.
        if user is None:
            if request.json:
                data = request.json
            elif request.form:
                data = request.form
            else:
                data = None

            # not enough data to authenticate
            if not data or not data.get('user') or not data.get('password'):
                return Response('Please authenticate to use the API.', 401)
            # data is wrong
            elif not User.auth(data.get('user'), data.get('password')):
                return Response('Authentication credentials are invalid.', 401)
            # user authenticated successfully
            else:
                user = User.query.filter_by(name=data.get('user')).first()
                set_current_user(user)
                g.current_user = user
                return f(*args, **kwargs)

        # if the user is invalid, kick invalidate the session and tell the user
        elif user is False:
            session['user'] = None
            return Response('Authenticated user invalid.', 401)

        # if the user is valid just add them to the g object
        else:
            g.current_user = user
            return f(*args, **kwargs)
    return decorated
