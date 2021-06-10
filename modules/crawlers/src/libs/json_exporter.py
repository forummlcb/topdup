import json

class JsonExporter():
    def __init__(self, filename):
        self._filename = filename

    def write_to_file(self, article_object):
        result = dict(
                article_id=str(article_object.get_id()),\
                topic=str(article_object.get_topic()),\
                href=str(article_object.get_href()),\
                publish_date=str(article_object.get_date()),\
                newspaper=str(article_object.get_newspaper()),\
                created_date=str(article_object.get_creation_date()),\
                language=str(article_object.get_language()),\
                sapo=str(article_object.get_sapo()),\
                content=str(article_object.get_full_content()),
                # feature_image=deature_image_url\
                )
        with open(self._filename, "a+") as f:
            data = json.dumps(result, indent=2, sort_keys=True)
            f.write(data)
