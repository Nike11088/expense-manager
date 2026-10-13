package app.nikita.expenses;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Согласует фон системных панелей с темой Vue без пересоздания Activity. */
@CapacitorPlugin(name = "Appearance")
public class AppearancePlugin extends Plugin {
    @PluginMethod
    public void apply(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getBridge().executeOnMainThread(() -> {
            int color = Color.parseColor(dark ? "#303030" : "#FAFAFA");
            getActivity().getTheme().applyStyle(dark ? R.style.ThemeBackground_Dark : R.style.ThemeBackground_Light, true);
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            if (android.os.Build.VERSION.SDK_INT < 35) {
                getActivity().getWindow().setStatusBarColor(color);
                getActivity().getWindow().setNavigationBarColor(color);
            }
            getBridge().getWebView().setBackgroundColor(color);
            call.resolve();
        });
    }
}
