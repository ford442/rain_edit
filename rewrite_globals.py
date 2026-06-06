import re
with open('src/main.js', 'r') as f:
    code = f.read()

# Replace top-level const, let, var
# We need to be careful not to replace inside blocks.
# It's better to just use AST coordinates to get the exact string and replace it.

import json
