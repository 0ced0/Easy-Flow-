from flask import Flask, Blueprint, render_template, abort;
from flask import Blueprint;
from jinja2 import TemplateNotFound;
from flask_cors import CORS;
# from test import page;
from sambat_to_bubukal_stream import stream;
# from endpoints import


app = Flask(__name__)
CORS(app,
     resources={
         r"/*":{
             "origin":["http://localhost:5173"]
         }
     })
app.register_blueprint(stream)



if __name__=="__main__":
    app.run(debug=True)
    
    
