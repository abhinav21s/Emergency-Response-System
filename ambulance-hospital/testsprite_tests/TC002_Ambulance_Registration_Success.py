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
        # -> Click on the 'Ambulance' link to navigate to ambulance registration page.
        frame = context.pages[-1]
        # Click on the 'Ambulance' link in the top navigation to go to ambulance registration page
        elem = frame.locator('xpath=html/body/div/nav/div/div/div/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Register as Ambulance' link to go to ambulance registration page.
        frame = context.pages[-1]
        # Click on 'Register as Ambulance' link to navigate to ambulance registration page
        elem = frame.locator('xpath=html/body/div/main/div/div/div/div/div/div[2]/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the ambulance registration form with valid details and submit.
        frame = context.pages[-1]
        # Input ambulance user name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        frame = context.pages[-1]
        # Input ambulance user email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya@gmail.com')
        

        frame = context.pages[-1]
        # Input ambulance user phone number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9876543210')
        

        frame = context.pages[-1]
        # Input ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[4]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Confirm ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[5]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Input driver name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        # -> Fill in the remaining ambulance registration fields: vehicle number, organization name, organization address, and organization contact, then submit the form.
        frame = context.pages[-1]
        # Input vehicle number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[4]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('MH12AB1234')
        

        frame = context.pages[-1]
        # Input organization name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Justice Emergency Org')
        

        frame = context.pages[-1]
        # Input organization address
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123 Main Street, City')
        

        frame = context.pages[-1]
        # Input organization contact number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9876543210')
        

        frame = context.pages[-1]
        # Click on 'Register Ambulance' button to submit the registration form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the 'Driver Name' field with valid data and resubmit the ambulance registration form.
        frame = context.pages[-1]
        # Input driver name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        frame = context.pages[-1]
        # Click on 'Register Ambulance' button to submit the form after filling driver name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill the ambulance registration form with a new unique email and valid details, then submit the form.
        frame = context.pages[-1]
        # Input ambulance user name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        frame = context.pages[-1]
        # Input new unique ambulance user email
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('aditya_new@gmail.com')
        

        frame = context.pages[-1]
        # Input ambulance user phone number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9876543210')
        

        frame = context.pages[-1]
        # Input ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[4]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Confirm ambulance user password
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div/div[5]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123456')
        

        frame = context.pages[-1]
        # Input driver license
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        # -> Fill in the vehicle number and organization name fields, then submit the ambulance registration form.
        frame = context.pages[-1]
        # Input vehicle number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[4]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('MH12AB1234')
        

        frame = context.pages[-1]
        # Input organization name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Justice Emergency Org')
        

        frame = context.pages[-1]
        # Click on 'Register Ambulance' button to submit the form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the missing required fields: Driver Name, Organization Address, and Organization Contact, then submit the form.
        frame = context.pages[-1]
        # Input driver name
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Aditya Kumar')
        

        frame = context.pages[-1]
        # Input organization address
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123 Main Street, City')
        

        frame = context.pages[-1]
        # Input organization contact number
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/div[3]/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('9876543210')
        

        frame = context.pages[-1]
        # Click on 'Register Ambulance' button to submit the form
        elem = frame.locator('xpath=html/body/div/main/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=No ambulance data available').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    