import instaloader , time, random

L = instaloader.Instaloader()
# L.load_session_from_file("chaitya_j21")  
profile = instaloader.Profile.from_username(L.context, "ucsdcasa")
for post in profile.get_posts():
   L.download_post(post, target=profile.username)
   time.sleep(random.uniform(5, 10))

