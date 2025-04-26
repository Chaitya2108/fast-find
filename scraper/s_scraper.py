from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

options = webdriver.ChromeOptions()
# path = '/Users/JeMappelleCHJ/.wdm/drivers/chromedriver/mac64/135.0.7049.114/chromedriver-mac-x64/chromedriver'
# service = Service(path)

# # options.add_argument("--headless")  # comment this out if you want to see browser
# options.add_argument("--window-size=1920,1080")
# options.add_argument("--disable-blink-features=AutomationControlled")  # stealth

driver = webdriver.Chrome(options=options)

driver.get("https://www.instagram.com/accounts/login/")
wait = WebDriverWait(driver, 30)

username_input = wait.until(EC.visibility_of_element_located((By.NAME, "username")))
password_input = wait.until(EC.visibility_of_element_located((By.NAME, "password")))

# username_input = driver.find_element(By.NAME, "username")
# password_input = driver.find_element(By.NAME, "password")

username_input.send_keys("chaitya_j21")
password_input.send_keys("J0dhawat@2108")

login_button = wait.until(EC.presence_of_element_located((By.XPATH, "//button[@type='submit']")))
# login_button = driver.find_element(By.XPATH, "//button[@type='submit']")
login_button.click()

time.sleep(5)  # Wait for login to complete


# profile_username = "ucsdcasa"
# driver.get(f"https://www.instagram.com/{profile_username}/")

# time.sleep(3)

# # Step 4: Scrape post captions
# posts = driver.find_elements(By.XPATH, "//article//a")
# for idx, post in enumerate(posts):
#     post_link = post.get_attribute('href')
#     print(f"Post {idx+1}: {post_link}")

driver.quit()


