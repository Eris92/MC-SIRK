from pathlib import Path
p = Path('test/move-request-submit-feedback.test.js')
s = p.read_text()
s = s.replace("source.indexOf('if (submitting || submitted) return;')", "source.indexOf('if (submitting || submitted) return false;')")
p.write_text(s)
