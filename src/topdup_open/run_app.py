import argparse
from topdup_app import app

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-d",
        "--debug", 
        action='store_true',
        help="turn on debugging mode"
    )
    args = parser.parse_args()
    if args.debug:
        app.run(debug=True)
    else:
        app.run()
    # app.run(host='0.0.0.0', debug=True) #docker