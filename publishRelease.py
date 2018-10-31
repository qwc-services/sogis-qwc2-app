#!/usr/bin/python

import requests
import json
import sys

if len(sys.argv) < 5:
    sys.stderr.write(
        "Usage: %s project_id tag token filenames\n" % sys.argv[0])
    sys.exit(1)

project_id = sys.argv[1]
tag = sys.argv[2]
token = sys.argv[3]

apiurl = "https://git.sourcepole.ch/api/v4/projects/" + project_id

# Upload files
upload_links = []
for argno in range(4, len(sys.argv)):
    fname = sys.argv[argno]
    response = requests.post(
        apiurl + "/uploads",
        files={"file": open(fname, "rb")},
        headers={'PRIVATE-TOKEN': token}
    )

    try:
        uploadurl = json.loads(response.text)["url"]
        upload_links.append("[%s](%s)" % (fname, uploadurl))
    except:
        sys.stderr.write("Upload failed:\n%s\n" % response.text)
        sys.exit(1)
    sys.stdout.write("File uploaded to %s\n" % uploadurl)

# Create/Update release tag notes
response = requests.post(
    apiurl + "/repository/tags/%s/release" % tag,
    json={"description": "%s" % ' '.join(upload_links)},
    headers={'PRIVATE-TOKEN': token}
)
if response.status_code == 409:
    # Already exists, update existing
    response = requests.put(
        apiurl + "/repository/tags/%s/release" % tag,
        json={"description": "%s" % ' '.join(upload_links)},
        headers={'PRIVATE-TOKEN': token}
    )

try:
    data = json.loads(response.text)
    sys.stdout.write("Published release %s: %s\n" %
                     (data["tag_name"], data["description"]))
except:
    sys.stderr.write("Failed to create/update release:\n%s\n" % response.text)
    sys.exit(1)

sys.exit(0)
