package app.nikita.expenses;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppearancePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
