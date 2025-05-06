const puppeteer = require('puppeteer');
const fs = require('fs');

async function generateScreenshots() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set viewport for mobile screenshot
        await page.setViewport({ width: 360, height: 640 });
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await page.screenshot({
            path: 'public/screenshots/screenshot-mobile.png',
            fullPage: true
        });

        // Set viewport for wide screenshot
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await page.screenshot({
            path: 'public/screenshots/screenshot-wide.png',
            fullPage: true
        });

        console.log('Screenshots generated successfully!');
    } catch (error) {
        console.error('Error generating screenshots:', error);
    } finally {
        await browser.close();
    }
}

generateScreenshots();
