from flask import Flask


def create_app(configobject=None, configfile=None):
    """App factory helper, generates an app object, configures it with
    the given objects/files, connects all modules to the instance and
    returns it."""
    app = Flask(__name__)

    if configfile:
        app.config.from_pyfile(configfile)

    db.init_app(app)

    import tools
    tools.setUp(app)

    import api
    api.setUp(app)

    import ui
    ui.setUp(app)

    import public
    public.setUp(app)

    return app

from flask.ext.sqlalchemy import SQLAlchemy
db = SQLAlchemy()
