from sqlalchemy.sql import text
import pandas as pd
from sqlalchemy import create_engine

# Define the SQLHelper Class
# PURPOSE: Deal with all of the database logic

class SQLHelper():

    # Initialize PARAMETERS/VARIABLES

    #################################################
    # Database Setup
    #################################################
    def __init__(self):
        self.engine = create_engine("sqlite:///cali_wildfires.sqlite")

    #################################################################

    def queryBarData(self):
        # Create our session (link) from Python to the DB
        conn = self.engine.connect() # Raw SQL/Pandas

        # Define Query
        query = text ("""SELECT
                    YearStarted as year,
                    count(UniqueID) as num_wildfires
                    FROM
                        cali_wildfires
                    GROUP BY
                        YearStarted
                    ORDER BY
                        YearStarted asc;""")
        df = pd.read_sql(query, con=conn)

        # Close the connection
        conn.close()
        return(df)

    def queryTableData(self):
        # Create our session (link) from Python to the DB
        conn = self.engine.connect() # Raw SQL/Pandas

        # Define Query
        query = text ("""SELECT
                    YearStarted as year,
                    Counties as county,
                    Name as name,
                    AcresBurned as acres_burned,
                    Latitude as latitude,
                    Longitude as longitude
                    FROM
                        cali_wildfires
                    ORDER BY
                        YearStarted asc, Counties asc;""")
        df = pd.read_sql(query, con=conn)

        # Close the connection
        conn.close()
        return(df)

    def queryMapData(self):
        # Create our session (link) from Python to the DB
        conn = self.engine.connect() # Raw SQL/Pandas

        # Define Query
        query = text ("""SELECT
                    YearStarted as year,
                    Counties as county,
                    Name as name,
                    AcresBurned as acres_burned,
                    Latitude as latitude,
                    Longitude as longitude
                    FROM
                        cali_wildfires
                    ORDER BY
                        YearStarted asc, Counties asc;""")
        df = pd.read_sql(query, con=conn)

        # Close the connection
        conn.close()
        return(df)