package app.nikita.expenses;

import static org.junit.Assert.*;
import android.content.pm.ActivityInfo;
import android.webkit.WebView;
import android.graphics.Bitmap;
import java.io.File;
import java.io.FileOutputStream;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ExpenseInstrumentedTest {
    private void screenshot(String name) throws Exception {
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        Thread.sleep(250);
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        File directory = InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null);
        try (FileOutputStream output = new FileOutputStream(new File(directory, name + ".png"))) { bitmap.compress(Bitmap.CompressFormat.PNG, 100, output); }
    }
    private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        assertTrue("JavaScript callback timeout", done.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void waitFor(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        long deadline = System.currentTimeMillis() + 30000;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(js(scenario, script))) return;
            Thread.sleep(200);
        }
        fail("Condition failed: " + script + "; page=" + js(scenario, "document.body.innerText"));
    }
    @Test public void sqliteRepositoryContract() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "!!document.querySelector('nav') && typeof window.runNativeChecks === 'function'");
            js(scenario, "window.runNativeChecks().then(v => window.nativeResult = v).catch(e => window.nativeResult = 'FAIL: ' + e.message); true");
            waitFor(scenario, "typeof window.nativeResult === 'string'");
            assertTrue(js(scenario, "window.nativeResult").startsWith("\"PASS:"));
        }
    }
    @Test public void uiPersistsExpenseAcrossRotationAndReload() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "!!document.querySelector('nav')");
            js(scenario, "location.hash = '/overview'; true");
            waitFor(scenario, "!!document.querySelector('.overview')");
            String before = js(scenario, "document.querySelector('[data-testid=overview-total]').innerText");
            js(scenario, "document.querySelector('a.fab').click(); true");
            waitFor(scenario, "!!document.querySelector('input[aria-label=Сумма]')");
            js(scenario, "(() => { const set=(label,v)=>{const e=document.querySelector('input[aria-label=\"'+label+'\"]');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));};set('Сумма','12,34');set('Примечание','Android UI test');return true;})()");
            scenario.onActivity(activity -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            waitFor(scenario, "document.querySelector('input[aria-label=Сумма]')?.value === '12,34'");
            scenario.onActivity(activity -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            js(scenario, "document.querySelector('form').requestSubmit(); true");
            waitFor(scenario, "!!document.querySelector('nav')");
            String after = js(scenario, "document.querySelector('[data-testid=overview-total]').innerText");
            assertNotEquals(before, after);
            js(scenario, "window.reloadMarker = true; location.reload(); true");
            waitFor(scenario, "typeof window.reloadMarker === 'undefined' && !!document.querySelector('nav')");
            assertEquals(after, js(scenario, "document.querySelector('[data-testid=overview-total]').innerText"));
            js(scenario, "location.hash = '/history'; true");
            waitFor(scenario, "!!document.querySelector('.expense-row')");
            js(scenario, "[...document.querySelectorAll('.expense-row')].find(e=>e.innerText.includes('Android UI test')).click(); true");
            waitFor(scenario, "!!document.querySelector('button[aria-label=\"Удалить расход\"]')");
            js(scenario, "document.querySelector('button[aria-label=\"Удалить расход\"]').click(); true");
            waitFor(scenario, "!!document.querySelector('dialog[open]')");
            js(scenario, "document.querySelector('dialog .danger').click(); true");
            waitFor(scenario, "!!document.querySelector('nav')");
            js(scenario, "location.hash = '/overview'; true");
            waitFor(scenario, "!!document.querySelector('[data-testid=overview-total]')");
            assertEquals(before, js(scenario, "document.querySelector('[data-testid=overview-total]').innerText"));
        }
    }
    @Test public void keyboardBackButtonAndThemeInsets() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "!!document.querySelector('nav')");
            assertEquals("true", js(scenario, "(() => { const nav=document.querySelector('nav').getBoundingClientRect(); const safe=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')); return nav.bottom <= innerHeight + 1 && safe >= 0; })()"));
            js(scenario, "document.querySelector('a[href=\"#/settings\"]').click(); true");
            waitFor(scenario, "!!document.querySelector('.theme-options')");
            js(scenario, "[...document.querySelectorAll('.theme-options button')].find(e=>e.innerText.includes('Тёмная')).click(); true");
            waitFor(scenario, "document.documentElement.dataset.theme === 'dark'");
            screenshot("android-dark-settings");
            scenario.onActivity(activity -> assertEquals(android.graphics.Color.parseColor("#303030"), ((android.graphics.drawable.ColorDrawable) activity.getWindow().getDecorView().getBackground()).getColor()));
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
            waitFor(scenario, "!!document.querySelector('.overview')");
            screenshot("android-dark-overview");
            js(scenario, "document.querySelector('a.fab').click(); true");
            waitFor(scenario, "!!document.querySelector('input[aria-label=Сумма]')");
            js(scenario, "document.querySelector('input[aria-label=Сумма]').focus(); true");
            scenario.onActivity(activity -> {
                WebView webView = activity.getBridge().getWebView();
                webView.requestFocus();
                ((InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
            });
            Thread.sleep(700);
            screenshot("android-keyboard");
            assertEquals("true", js(scenario, "document.activeElement?.getAttribute('aria-label') === 'Сумма'"));
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK);
            waitFor(scenario, "!!document.querySelector('input[aria-label=Сумма]')");
            js(scenario, "document.querySelector('.editor-toolbar a').click(); true");
            waitFor(scenario, "!!document.querySelector('nav')");
            js(scenario, "document.querySelector('a[href=\"#/settings\"]').click(); true");
            waitFor(scenario, "!!document.querySelector('.theme-options')");
            js(scenario, "[...document.querySelectorAll('.theme-options button')].find(e=>e.innerText.includes('Светлая')).click(); true");
            waitFor(scenario, "document.documentElement.dataset.theme === 'light'");
            js(scenario, "document.querySelector('a[href=\"#/overview\"]').click(); true");
            waitFor(scenario, "!!document.querySelector('.overview')");
            screenshot("android-light-overview");
        }
    }
}
