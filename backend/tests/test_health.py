def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_api_requires_auth(client):
    r = client.post("/api/ocr/receipt", files={"image": ("r.txt", b"x", "text/plain")})
    assert r.status_code == 401


def test_dev_flag_skips_auth(dev_client):
    # Gets past auth and fails on validation instead (400 = not an image).
    r = dev_client.post("/api/ocr/receipt", files={"image": ("r.txt", b"x", "text/plain")})
    assert r.status_code == 400


def test_cors_origins_ignore_trailing_slash():
    from tests.conftest import make_settings

    s = make_settings(CORS_ORIGINS="https://dukebaseball.netlify.app/, http://localhost:5173")
    assert s.cors_origin_list == ["https://dukebaseball.netlify.app", "http://localhost:5173"]
