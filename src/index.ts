/**
 * @fileoverview This file is the entry point of the application.
 *
 * All the application code is in this file.
 *
 * It is responsible for:
 * - Initializing puppeteer and the browser
 * - start navigating to the first page: https://service.berlin.de/dienstleistung/120686/
 * - click on the button "Termin berlinweit suchen" in the top right corner
 * - wait for the page to load
 * - check the calendar for available dates
 * - if available dates are found, log the to the console // TODO later an appointment should be booked
 */

import '@total-typescript/ts-reset'
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer'

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ['--start-maximized'],
})

const page = await browser.newPage()

const APPOINTMENT_BUTTON_TEXT = 'Termin berlinweit suchen'
const XPathForAppointmentButton = `//a[contains(text(), '${APPOINTMENT_BUTTON_TEXT}')]`
const XPathForCalendar =
  '//*[@id="layout-grid__area--maincontent"]/div/div/div[2]/div[2]/div/div/div[4]/div'

async function getMyAppointment() {
  await page.goto('https://service.berlin.de/dienstleistung/120686/')

  // find anchor with text "Termin berlinweit suchen" and click it

  const [buttonNode] = await page.$x(XPathForAppointmentButton)

  if (!buttonNode) {
    console.log('Button not found')
    await browser.close()
    return
  }

  const buttonElement =
    (await buttonNode.asElement()) as ElementHandle<HTMLAnchorElement>
  await buttonElement.click()

  await page.waitForNavigation({ waitUntil: 'networkidle0' })

  await reloadPageUntilAppointmentWasFound()
}

async function reloadPageUntilAppointmentWasFound() {
  const interval = 10000

  const anchorElementsWithNumbers = await checkCalendarForAppointments()

  if (!anchorElementsWithNumbers) {
    await new Promise(r => setTimeout(r, interval))

    await page.reload()
    await reloadPageUntilAppointmentWasFound()
  }
}

async function checkCalendarForAppointments() {
  // search inside the calendar for anchor elements
  const [calendar] = await page.$x(XPathForCalendar)

  if (!calendar) {
    console.log('Calendar not found')
    await browser.close()
    return
  }

  // search for anchor elements inside the calendar
  const anchorElements = await calendar.$$('a')

  // filter all anchor elements that contain a number as text
  const anchorElementsWithNumbers = (
    await Promise.all(
      anchorElements.map(async anchorElement => {
        const text = await page.evaluate(el => el.textContent, anchorElement)
        if (/\d/.test(text ?? '')) {
          return anchorElement
        }
      }),
    )
  ).filter(Boolean)

  // print the content of the anchor elements
  for (const anchorElement of anchorElementsWithNumbers) {
    const text = await page.evaluate(el => el.textContent, anchorElement)
    console.log(text)
  }

  const foundDates = await Promise.all(
    anchorElementsWithNumbers.map(async anchorElement => {
      const text = await page.evaluate(el => el.textContent, anchorElement)
      return text
    }),
  )

  if (anchorElementsWithNumbers.length > 0) {
    console.log('Appointment found for these dates:', foundDates.join(', '))
    return anchorElementsWithNumbers
  }
}

await getMyAppointment()

// set a time out for 20 seconds
// await new Promise(r => setTimeout(r, 5000))

await browser.close()
