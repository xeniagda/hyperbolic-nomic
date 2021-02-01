from abc import ABC, abstractmethod
from datetime import datetime, timezone

def now():
    return datetime.now(tz=timezone.utc)

def timestamp_to_json(ts):
    return ts.strftime("%Y-%m-%d %H:%M UTC")

class Delta(ABC):
    def __init__(self, field, author, timestamp):
        self.field = field
        self.author = author
        self.timestamp = timestamp

    @abstractmethod
    def into_json_struct(self):
        pass

    @abstractmethod
    def update_fields(self, fields):
        pass

class FieldEdit(Delta):
    def __init__(self, field, new_content, did_create, author, timestamp):
        super(FieldEdit, self).__init__(field, author, timestamp)
        self.new_content = new_content
        self.did_create = did_create

    def into_json_struct(self):
        return {
            "type": "edit",
            "field": self.field,
            "new_content": self.new_content,
            "author": self.author,
            "timestamp": timestamp_to_json(self.timestamp),
            "did_create": self.did_create,
        }

    def update_fields(self, fields):
        fields[self.field] = self.new_content

class FieldDeletion(Delta):
    def __init__(self, field, author, timestamp):
        super(FieldDeletion, self).__init__(field, author, timestamp)

    def into_json_struct(self):
        return {
            "type": "deletion",
            "field": self.field,
            "author": self.author,
            "timestamp": timestamp_to_json(self.timestamp),
        }

    def update_fields(self, fields):
        del fields[self.field]

class TileData:
    def __init__(self):
        self.field_history = []

        self.field_cache = None

    # Don't pickle the cache!
    def __getstate__(self):
        state = self.__dict__.copy()
        del state["field_cache"]
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self.field_cache = None

    def get_fields(self):
        if self.field_cache is not None:
            return self.field_cache

        fields = {}
        for thing in self.field_history:
            thing.update_fields(fields)

        self.field_cache = fields
        return fields

    def set_field(self, field_name, value, author):
        did_create = field_name not in self.get_fields()
        self.field_history.append(FieldEdit(field_name, value, did_create, author, now()))
        self.field_cache = None

    def delete_field(self, field_name, author):
        self.field_history.append(FieldDeletion(field_name, author, now()))
        self.field_cache = None

    def __str__(self):
        return f"TileData({','.join(str(k) + '=' + str(v) for k, v in self.fields.items())})"

    def __repr__(self):
        return f"TileData({','.join(repr(k) + '=' + repr(v) for k, v in self.fields.items())})"

    def into_json_struct(self):
        return self.get_fields()

    def detailed(self):
        return [h.into_json_struct() for h in self.field_history]
