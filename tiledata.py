class TileData:
    def __init__(self):
        self.fields = {}

    def set_field(self, field_name, value):
        self.fields[field_name] = value

    def delete_field(self, field_name):
        del self.fields[field_name]

    def __str__(self):
        return f"TileData({','.join(str(k) + '=' + str(v) for k, v in self.fields.items())})"

    def __repr__(self):
        return f"TileData({','.join(repr(k) + '=' + repr(v) for k, v in self.fields.items())})"

    def into_json_struct(self):
        return self.fields
