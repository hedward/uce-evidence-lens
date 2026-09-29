import type { AppController } from "./controller";
import { registerWebMcpTools } from "../webmcp/register";
import { parseRecipientRecordHash } from "../records/recipient-link";

interface HashNavigationTarget {
  readonly location: Pick<Location, "hash">;
  addEventListener(type: "hashchange", listener: () => void): void;
}

async function loadHashSelection(
  controller: AppController,
  hash: string,
  loadDemoWhenUnrelated: boolean,
): Promise<void> {
  let parsed;
  try {
    parsed = parseRecipientRecordHash(hash);
  } catch (error) {
    controller.rejectRecipientLink(
      error instanceof Error
        ? error.message
        : "The recipient record link is invalid.",
    );
    return;
  }

  if (parsed.kind === "record") {
    // Load failures remain visible in AppController state. Handling the rejected
    // promise here also keeps later hashchange events from becoming unhandled.
    await controller.load(parsed.reference).catch(() => undefined);
  } else if (loadDemoWhenUnrelated) {
    await controller.load("demo").catch(() => undefined);
  }
}

export async function startApplication(
  controller: AppController,
  currentDocument: Document = document,
  navigation: HashNavigationTarget | undefined = currentDocument.defaultView ??
    undefined,
): Promise<void> {
  await registerWebMcpTools(controller, currentDocument);

  if (navigation) {
    navigation.addEventListener("hashchange", () => {
      void loadHashSelection(controller, navigation.location.hash, false);
    });
    await loadHashSelection(controller, navigation.location.hash, true);
    return;
  }

  await controller.load("demo");
}
