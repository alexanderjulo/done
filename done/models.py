from datetime import date, timedelta
import json
from done import db, bcrypt


class DateMixin(object):
    created = db.Column(db.Date)
    due = db.Column(db.Date)
    completed = db.Column(db.Date)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    password = db.Column(db.Text)

    def set_password(self, password):
        hash = bcrypt.generate_password_hash(password)
        self.password = hash

    @classmethod
    def auth(self, name, password):
        print name, password
        user = self.query.filter_by(name=name).first()
        return user is not None and \
            bcrypt.check_password_hash(user.password, password)


class Area(db.Model):
    __tablename__ = 'areas'
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey(User.id))
    name = db.Column(db.Text)

    @property
    def repr(self):
        data = {
            'id': self.id,
            'name': self.name,
            'owner_id': self.owner_id
        }
        return data

    @property
    def json(self):
        return json.dumps(self.repr)


class Project(db.Model, DateMixin):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey(User.id))
    area_id = db.Column(db.Integer, db.ForeignKey(Area.id))

    @property
    def repr(self):
        if isinstance(self.created, date):
            created = self.created.isoformat()
        else:
            created = None
        if isinstance(self.due, date):
            due = self.due.isoformat()
        else:
            due = None
        if isinstance(self.completed, date):
            completed = self.completed.isoformat()
        else:
            completed = None
        data = {
            'id': self.id,
            'name': self.name,
            'owner_id': self.owner_id,
            'area_id': self.area_id,
            'created': created,
            'due': due,
            'completed': completed
        }
        return data

    @property
    def json(self):
        return json.dumps(self.repr)

    @property
    def taskcount(self):
        tasks = Task.query.filter(
            Task.project_id == self.id
        ).all()
        return len(tasks)

    @property
    def completedtaskcount(self):
        tasks = Task.query.filter(
            Task.project_id == self.id,
            Task.completed != None
        ).all()
        return len(tasks)


class Task(db.Model, DateMixin):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey(User.id))
    name = db.Column(db.Text)
    area_id = db.Column(db.Integer, db.ForeignKey(Area.id))
    project_id = db.Column(db.Integer, db.ForeignKey(Project.id))
    recurral = db.Column(db.Text())

    def __init__(self):
        self.created = date.today()

    def complete(self, when=None):
        if self.recurral:
            self.recur()
        if not when:
            when = date.today()
        self.completed = when

    def recur(self):
        task = Task()
        db.session.add(task)
        task.owner_id = self.owner_id
        task.name = self.name
        task.area_id = self.area_id
        task.project_id = self.project_id
        db.session.add(task)
        return task

    @property
    def repr(self):
        data = {
            'id': self.id,
            'name': str(self.name),
            'owner_id': self.owner_id,
            'area_id': self.area_id,
            'project_id': self.project_id,
            'recurral': self.recurral,
            'created': self.created.isoformat(),
            'due': self.due.isoformat() if isinstance(self.due, date)
            else None,
            'completed': self.completed.isoformat() if
            isinstance(self.completed, date) else None
        }
        return data

    @property
    def json(self):
        return json.dumps(self.repr)

    @property
    def overdue(self):
        return self.due and date.today() - self.due > timedelta(days=0)

    @property
    def duetoday(self):
        return self.due == date.today()

Task.project = db.relationship(Project)
Task.area = db.relationship(Area)


class Note(db.Model):
    __tablename__ = 'notes'
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey(User.id))
    task_id = db.Column(db.Integer, db.ForeignKey(Task.id))
    project_id = db.Column(db.Integer, db.ForeignKey(Project.id))
    content = db.Text()

Task.notes = db.relationship(Note)
Project.notes = db.relationship(Note)
