/**
 * 软件单元：entry/src/main/ets/platform/PlatformBridge.ets
 * 平台能力适配桥（对应图谱：su-platform-bridge / le-platform-bridge / imp-platform-bridge）。
 * 统一封装 HarmonyOS 平台能力：AbilityContext、@ohos.data.preferences 存储、唯一 ID、日志。
 */

import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { hilog } from '@kit.PerformanceAnalysisKit';

const STORE_NAME: string = 'idpdv_todo_store';
const DOMAIN: number = 0x0000;
const TAG: string = 'IDPDVTodo';

export class PlatformBridge {
  private static context: common.UIAbilityContext | null = null;
  private static store: preferences.Preferences | null = null;
  private static seq: number = 0;

  /** 由 EntryAbility.onCreate 注入 AbilityContext。 */
  static init(context: common.UIAbilityContext): void {
    PlatformBridge.context = context;
  }

  static isReady(): boolean {
    return PlatformBridge.context !== null;
  }

  /** 获取持久化 Preferences（首次调用创建并缓存）。 */
  static async getStore(): Promise<preferences.Preferences> {
    const cached: preferences.Preferences | null = PlatformBridge.store;
    if (cached !== null) {
      return cached;
    }
    const ctx: common.UIAbilityContext | null = PlatformBridge.context;
    if (ctx === null) {
      throw new Error('PlatformBridge is not initialized with an AbilityContext');
    }
    const created: preferences.Preferences = await preferences.getPreferences(ctx, { name: STORE_NAME });
    PlatformBridge.store = created;
    return created;
  }

  /** 生成进程内唯一任务 ID。 */
  static newId(): string {
    PlatformBridge.seq = PlatformBridge.seq + 1;
    return 'task-' + Date.now().toString() + '-' + PlatformBridge.seq.toString();
  }

  static log(message: string): void {
    hilog.info(DOMAIN, TAG, '%{public}s', message);
  }
}
