# My Scripts internal shared area

`_shared` is reserved for reusable internal My Scripts helpers.

The My Scripts public tree and public script execution API must not expose underscore-prefixed paths. Shared runtime owners may use files from this directory explicitly when a real reusable helper is required.

Do not place operator-invoked scripts here.
