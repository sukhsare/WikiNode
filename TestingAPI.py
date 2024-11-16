import requests

# Define the URL for the Wikipedia API
api_url = "https://en.wikipedia.org/w/api.php"

# Set up parameters for the API call
params = {
    "action": "query",
    "format": "json",
    "titles": "Travis Scott",  # Replace with any article title you want
    "prop": "extracts",
    "exintro": True  # Get only the introductory section
}

# Make the GET request
response = requests.get(api_url, params=params)

# Check if the request was successful
if response.status_code == 200:
    data = response.json()
    # Extract the page content
    pages = data['query']['pages']
    for page_id, page_info in pages.items():
        if 'extract' in page_info:
            print(page_info['extract'])
        else:
            print("Article content not found.")
else:
    print("Failed to fetch data. Status code:", response.status_code)
