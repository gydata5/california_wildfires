import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from sqlHelper import SQLHelper


#################################################
# Flask Setup
#################################################
app = Flask(__name__)
CORS(app)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0 # remove caching

# SQL Helper
sqlHelper = SQLHelper()


#################################################
# Flask Routes
#################################################

# @app.route("/")
# def welcome():
#     return render_template("index.html")

# @app.route("/dashboard")
# def dashboard():
#     return render_template("dashboard.html")
                           
# @app.route("/map")
# def map():
#     return render_template("map.html")
                           
# @app.route("/about_us")
# def about_us():
#     return render_template("about_us.html")
                           
# @app.route("/works_cited")
# def works_cited():
#     return render_template("works_cited.html")
# 
#################################################
# Flask API Routes
#################################################
@app.route("/")
def welcome():
    return (
        f"Welcome to the California Wildfires API!<br/>"
        f"Available Routes:<br/>"
        f"/api/v1.0/bar_data<br/>"
        f"/api/v1.0/table_data<br/>"
        f"/api/v1.0/map_data"
    )

@app.route("/api/v1.0/bar_data")
def bar_data():
    # Execute queries
    df = sqlHelper.queryBarData()
    # Convert any NaN values to None to produce valid JSON
    df = df.where(pd.notnull(df), None)
    # Turn DataFrame into List of Dictionary
    data = df.to_dict(orient="records")
    return jsonify(data)

@app.route("/api/v1.0/table_data")
def table_data():
    # Execute Query
    df = sqlHelper.queryTableData()
    
    # Convert numeric columns to proper types
    numeric_columns = ['acres_burned', 'latitude', 'longitude']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Group by county and year and calculate summaries
    county_summary = df.groupby(['county', 'year']).agg({
        'acres_burned': 'sum',
        'name': 'count'
    }).reset_index()
    
    # Rename columns
    county_summary.columns = ['county', 'year', 'total_acres_burned', 'num_wildfires']
    
    # Convert NaN values to None and convert to native Python types
    county_summary = county_summary.where(pd.notnull(county_summary), None)
    data = county_summary.to_dict(orient="records")
    
    return jsonify(data)

@app.route("/api/v1.0/map_data")
def map_data():
    # Execute Query
    df = sqlHelper.queryMapData()
    # Drop any rows with NaN values
    df = df.dropna()
    # Turn DataFrame into List of Dictionary
    data = df.to_dict(orient="records")
    return jsonify(data)

#############################################################

# ELIMINATE CACHING
@app.after_request
def add_header(r):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    r.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r

#main
if __name__ == "__main__":
    app.run(debug=True)