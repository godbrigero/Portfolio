import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { compareScaledPngs, type PngDimensions } from './proportionalImage';

type ScaleCase = {
  name: string;
  viewport: PngDimensions;
  smallerDeviceScaleFactor: number;
  largerDeviceScaleFactor: number;
  maxMismatchRatio: number;
};

type PageCase = {
  name: string;
  path: string;
};

const pageCases: PageCase[] = [
  { name: 'home', path: '/' },
  { name: 'project-open-source-test', path: '/project/open_source/test' },
];

const scaleCases: ScaleCase[] = [
  {
    name: 'desktop-2x',
    viewport: { width: 1440, height: 900 },
    smallerDeviceScaleFactor: 1,
    largerDeviceScaleFactor: 2,
    maxMismatchRatio: 0.025,
  },
  {
    name: 'tablet-2x',
    viewport: { width: 1024, height: 768 },
    smallerDeviceScaleFactor: 1,
    largerDeviceScaleFactor: 2,
    maxMismatchRatio: 0.025,
  },
  {
    name: 'mobile-2x',
    viewport: { width: 390, height: 844 },
    smallerDeviceScaleFactor: 1,
    largerDeviceScaleFactor: 2,
    maxMismatchRatio: 0.04,
  },
];

async function installDeterministicBrowserState(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.removeItem('portfolio:terminal-state:v1');
  });
}

async function capturePage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('body').waitFor({ state: 'visible' });

  return page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
  });
}

async function capturePageAtScale(
  browser: Browser,
  path: string,
  viewport: PngDimensions,
  deviceScaleFactor: number,
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    colorScheme: 'dark',
  });

  await installDeterministicBrowserState(context);

  const page = await context.newPage();

  try {
    return await capturePage(page, path);
  } finally {
    await context.close();
  }
}

function ratioPercent(value: number) {
  return `${(value * 100).toFixed(3)}%`;
}

async function attachArtifacts(testInfo: TestInfo, result: Awaited<ReturnType<typeof compareScaledPngs>>) {
  await Promise.all([
    testInfo.attach('upscaled-smaller-screenshot', {
      path: result.upscaledPath,
      contentType: 'image/png',
    }),
    testInfo.attach('larger-screenshot', {
      path: result.largerPath,
      contentType: 'image/png',
    }),
    testInfo.attach('pixel-diff', {
      path: result.diffPath,
      contentType: 'image/png',
    }),
  ]);
}

test.describe('proportional visual scaling', () => {
  for (const pageCase of pageCases) {
    for (const scaleCase of scaleCases) {
      test(`${pageCase.name} keeps proportions at ${scaleCase.name}`, async ({ browser }, testInfo) => {
        const smallerPng = await capturePageAtScale(
          browser,
          pageCase.path,
          scaleCase.viewport,
          scaleCase.smallerDeviceScaleFactor,
        );
        const largerPng = await capturePageAtScale(
          browser,
          pageCase.path,
          scaleCase.viewport,
          scaleCase.largerDeviceScaleFactor,
        );
        const result = await compareScaledPngs({
          smallerPng,
          largerPng,
          artifactBasePath: testInfo.outputPath(`${pageCase.name}-${scaleCase.name}`),
          maxMismatchRatio: scaleCase.maxMismatchRatio,
        });

        await attachArtifacts(testInfo, result);

        expect(
          result.mismatchRatio,
          [
            `${pageCase.path} exceeded proportional pixel drift for ${scaleCase.name}.`,
            `Mismatched ${result.mismatchedPixels}/${result.totalPixels} pixels.`,
            `Actual: ${ratioPercent(result.mismatchRatio)}; limit: ${ratioPercent(result.maxMismatchRatio)}.`,
            `Diff: ${result.diffPath}`,
          ].join('\n'),
        ).toBeLessThanOrEqual(result.maxMismatchRatio);
      });
    }
  }
});
