import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on the Ambulance link to go to ambulance login page
        frame = context.pages[-1]
        # Click on Ambulance link to navigate to ambulance login page
        elem = frame.locator('xpath=html/body/div/nav/div/div/div/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Enter ambulance email and password, then click login button
        frame = context.pages[-1]
        # Enter ambulance email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya@gmail.com')
        

        frame = context.pages[-1]
        # Enter ambulance password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Click login button to submit ambulance login form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Inspect network requests during login to capture JWT token in response headers or body
        frame = context.pages[-1]
        # Click Ambulance link to go back to ambulance login page
        elem = frame.locator('xpath=html/body/div/main/nav/div/div/div/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Try to logout and check if JWT token is cleared or check for any token in cookies or storage again
        frame = context.pages[-1]
        # Click Logout button to logout ambulance user
        elem = frame.locator('xpath=html/body/div/main/div/nav/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on Ambulance link to navigate to ambulance login page for a fresh login attempt and token verification
        frame = context.pages[-1]
        # Click on Ambulance link to go to ambulance login page
        elem = frame.locator('xpath=html/body/div/nav/div/div/div/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Enter ambulance email and password, then click login button
        frame = context.pages[-1]
        # Enter ambulance email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya@gmail.com')
        

        frame = context.pages[-1]
        # Enter ambulance password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Click login button to submit ambulance login form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Justice Emergency Response').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dashboard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hospital Search').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Notifications').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Profile').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Logout').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Server Status').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=CONNECTED').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=You are connected to the emergency network').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hospitals Available').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=5').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=hospitals registered in the system').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nearby Hospitals:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Apollo Hospital Seshadripuram').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=doctors available').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Baptist').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Aster CMI Updated').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=+ 2 more hospitals').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Selected Hospital').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=No hospital selected').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Select Hospital').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Ambulance Information').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Ambulance ID:68231ca987800c684e68e562').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Driver:Aditya').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Vehicle Number:KA04MN5562').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Location Status:Error: User denied Geolocation').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Quick Actions').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Call Hospital').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Change Hospital').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Justice Emergency').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Connecting ambulances with hospitals in real-time for faster emergency response and better patient outcomes.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=+91 9901217271').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=mauryaaditya00@gmail.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Kogilu agrahara yelhanka Banglore 560064').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=For Hospitals').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hospital Registration').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Doctor Management').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Emergency Notifications').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=For Ambulances').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Ambulance Registration').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hospital Search').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Real-time Navigation').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=© 2025 Justice Emergency Response System. All rights reserved.').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    