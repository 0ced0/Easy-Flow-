from flask import Flask, Blueprint, render_template, abort;
from flask import Blueprint;
from jinja2 import TemplateNotFound;
from flask_cors import CORS;
import logging
from streamControl import stream, startBackend;


logging.getLogger("werkzeug").setLevel(logging.ERROR)
app = Flask(__name__)
CORS(app,
     resources={
         r"/*":{
             "origin":["http://localhost:5173"]
         }
     })

app.register_blueprint(stream)


# print(app.url_map)

if __name__=="__main__":
    startBackend()
    app.run(debug=True)

    
    
