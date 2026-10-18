import re

with open('src/tabManager/viewModes.js', 'r') as f:
    content = f.read()

# Remove the duplicates in _deactivateAllViews.
# They are around line 133 and 187.
content = re.sub(r'^\s*this\.isCascadingDepthView = false;\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*this\.isHolographicCylinderView = false;\n', '', content, flags=re.MULTILINE)

# Add them back correctly at the beginning of _deactivateAllViews
content = content.replace(
    'this.isQuantumWebView = false;',
    'this.isQuantumWebView = false;\n    this.isCascadingDepthView = false;\n    this.isHolographicCylinderView = false;'
)

# Remove the duplicates in classList.remove
content = re.sub(r'^\s*"cascading-depth-active",\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*"holographic-cylinder-active",\n', '', content, flags=re.MULTILINE)

# Add them back correctly at the beginning of classList.remove
content = content.replace(
    '"synapse-web-active",',
    '"synapse-web-active",\n      "cascading-depth-active",\n      "holographic-cylinder-active",'
)

with open('src/tabManager/viewModes.js', 'w') as f:
    f.write(content)

with open('src/workspace/sessionSchema.js', 'r') as f:
    schema = f.read()

schema = schema.replace(
    '"quantum-web": "quantum-web-active",',
    '"quantum-web": "quantum-web-active",\n  "cascading-depth": "cascading-depth-active",\n  "holographic-cylinder": "holographic-cylinder-active",'
)

with open('src/workspace/sessionSchema.js', 'w') as f:
    f.write(schema)
