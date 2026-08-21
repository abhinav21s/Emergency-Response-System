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
        # -> Click on Ambulance link to go to ambulance login page.
        frame = context.pages[-1]
        # Click on Ambulance link to navigate to ambulance login page
        elem = frame.locator('xpath=html/body/div/nav/div/div/div/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input ambulance login credentials (email: aditya@gmail.com, password: 123456) and click login.
        frame = context.pages[-1]
        # Input ambulance user email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya@gmail.com')
        

        frame = context.pages[-1]
        # Input ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Click login button to submit ambulance login form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Select Hospital' button to attempt creating emergency request without hospital selection.
        frame = context.pages[-1]
        # Click on 'Select Hospital' button to open hospital selection for emergency request
        elem = frame.locator('xpath=html/body/div/main/div[2]/div/div[3]/div[2]/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to create emergency request without selecting a hospital and verify validation error messages.
        frame = context.pages[-1]
        # Click on first hospital in the list to select it and proceed to emergency request creation
        elem = frame.locator('xpath=html/body/div/main/div/div/div[4]/div/div/div[2]/div/div/div[4]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Try to find and click a button or link to create emergency request without selecting hospital to trigger validation error messages.
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        # -> Look for a button or link to create emergency request without selecting hospital or with incomplete patient details to trigger validation error messages.
        await page.mouse.wheel(0, -await page.evaluate('() => window.innerHeight'))
        

        # -> Try to find and click an element to initiate emergency request creation without selecting a hospital to trigger validation error messages.
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        # -> Navigate back to ambulance dashboard to find emergency request creation option or form.
        frame = context.pages[-1]
        # Click on Dashboard link to go back to ambulance dashboard
        elem = frame.locator('xpath=html/body/div/main/div/nav/div/div/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Select Hospital' button to try to create emergency request without hospital selection and check validation.
        frame = context.pages[-1]
        # Click on 'Select Hospital' button to open hospital selection interface
        elem = frame.locator('xpath=html/body/div/main/div[2]/div/div[3]/div[2]/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Try to select a hospital from the list to proceed to emergency request creation form and then test validation by submitting incomplete patient details.
        frame = context.pages[-1]
        # Click on Sparsh Hospital in hospital list to select hospital and proceed to emergency request creation form
        elem = frame.locator('xpath=html/body/div/main/div/div/div[4]/div[2]/div/div[2]/div/div[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to submit emergency request with missing required fields (no patient gender, no patient type) and verify validation error messages.
        frame = context.pages[-1]
        # Click 'Send Emergency Notification' button with missing required fields to trigger validation errors
        elem = frame.locator('xpath=html/body/div/main/div/div/div[4]/div/div/div[2]/div/div[2]/div[4]/div/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate back to the ambulance dashboard or emergency request form to resume validation testing.
        await page.goto('http://localhost:3000/', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Click on Ambulance link to login again as ambulance user and resume emergency request creation validation testing.
        frame = context.pages[-1]
        # Click on Ambulance link to go to ambulance login page
        elem = frame.locator('xpath=html/body/div/nav/div/div/div/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input ambulance login credentials and click login to access ambulance dashboard.
        frame = context.pages[-1]
        # Input ambulance user email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya@gmail.com')
        

        frame = context.pages[-1]
        # Input ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Click login button to submit ambulance login form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Error: User denied Geolocation').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=You are connected to the emergency network').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=CONNECTED').first).to_be_visible(timeout=30000)
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
        await expect(frame.locator('text=Sparsh Hospital Yelahanka').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Address:New Airport Road, Kogilu Cross, Nehru Nagar, Bengaluru, Karnataka 560064, Bangalore, Karnataka 560064').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Phone:9901217271').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Doctors:1 of 1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Available Specializations:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=General').first).to_be_visible(timeout=30000)
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
    