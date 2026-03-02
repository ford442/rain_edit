import re

with open('src/StorageAPI.js', 'r') as f:
    content = f.read()

content = content.replace("export const STORAGE_CATEGORIES = ['songs', 'patterns', 'banks', 'samples', 'shaders', 'music'];", "export const STORAGE_CATEGORIES = ['songs', 'patterns', 'banks', 'samples', 'shaders', 'music', 'images'];")

with open('src/StorageAPI.js', 'w') as f:
    f.write(content)
