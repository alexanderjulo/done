from flask.ext.script import Manager
from done import create_app, db


manager = Manager(create_app)
manager.add_option('-c', '--config', dest='configfile', required=False)


@manager.command
def initdb():
    db.create_all()

if __name__ == '__main__':
    manager.run()
