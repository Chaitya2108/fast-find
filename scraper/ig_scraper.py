'''
UNUSED
'''

import instaloader

def scrapeByHashtag(hashtag, max_posts=10):
    L = instaloader.Instaloader()
    # USERNAME = "chaitya_j21"
    # PASSWORD = "J0dhawat@2108"
    # L.login(USERNAME, PASSWORD)

    L.load_session_from_file("chaitya_j21")  
    # session = L.context._session
    # session.headers.update({
    #      'User-Agent': 'Instagram 155.0.0.37.107 Android (28/9; 420dpi; 1080x1920; OnePlus; A6013; OnePlus6T; qcom; en_US)'
    #  })



    posts = instaloader.Hashtag.from_name(L.context, hashtag).get_posts_resumable()

    event_data = []
    for idx, post in enumerate(posts):
        if idx >= max_posts:
            break
        post_data = {
            'caption': post.caption,
            'date_utc': post.date_utc,
            'location': post.location.name if post.location else None,
            'url': f"https://instagram.com/p/{post.shortcode}",
        }
        event_data.append(post_data)
    return event_data

if __name__ == "__main__":
    hashtag="casa"
    events = scrapeByHashtag(hashtag)
    for e in events:
        print(e)