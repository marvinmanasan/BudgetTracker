package bulsa.backup

import android.app.Activity
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private object CreateBackupDocument : AppContextActivityResultContract<String, String?> {
  override fun createIntent(context: Context, input: String) =
    Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/json"
      putExtra(Intent.EXTRA_TITLE, input)
    }

  override fun parseResult(input: String, resultCode: Int, intent: Intent?): String? {
    if (resultCode == Activity.RESULT_CANCELED) return null
    check(resultCode == Activity.RESULT_OK && intent?.data?.scheme == "content") {
      "Could not open the selected file."
    }
    return requireNotNull(intent?.data).toString()
  }
}

class BulsaBackupModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BulsaBackupDocument")
    lateinit var launcher: AppContextActivityResultLauncher<String, String?>
    RegisterActivityContracts { launcher = registerForActivityResult(CreateBackupDocument) }
    AsyncFunction("chooseFile") Coroutine { name: String -> launcher.launch(name) }
  }
}
