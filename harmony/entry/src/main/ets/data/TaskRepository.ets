/**
 * 软件单元：entry/src/main/ets/data/TaskRepository.ets
 * TaskRepository 本地存储实现（对应图谱：su-task-repository / le-task-repository / imp-task-repository）。
 * 通过 PlatformBridge 使用 @ohos.data.preferences 持久化任务列表。
 */

import { preferences } from '@kit.ArkData';
import { Task, TaskJson } from '../model/Task';
import { PlatformBridge } from '../platform/PlatformBridge';

const KEY_TASKS: string = 'tasks';

export class TaskRepository {
  private store: preferences.Preferences | null = null;
  private tasks: Task[] = [];

  /** 读取持久化任务；若失败则回退为空内存列表。 */
  async init(): Promise<void> {
    try {
      this.store = await PlatformBridge.getStore();
      const raw: string = await this.store.get(KEY_TASKS, '[]') as string;
      this.tasks = TaskRepository.decode(raw);
    } catch (err) {
      PlatformBridge.log('TaskRepository.init fallback to in-memory: ' + JSON.stringify(err));
      this.store = null;
      this.tasks = [];
    }
  }

  getAll(): Task[] {
    return this.tasks;
  }

  replaceAll(tasks: Task[]): void {
    this.tasks = tasks;
  }

  /** 将当前内存列表写回 Preferences。存储不可用时保持内存实现。 */
  async persist(): Promise<void> {
    if (this.store === null) {
      return;
    }
    try {
      await this.store.put(KEY_TASKS, TaskRepository.encode(this.tasks));
      await this.store.flush();
    } catch (err) {
      PlatformBridge.log('TaskRepository.persist failed: ' + JSON.stringify(err));
    }
  }

  private static encode(tasks: Task[]): string {
    const arr: TaskJson[] = [];
    for (let i = 0; i < tasks.length; i++) {
      arr.push(tasks[i].toJson());
    }
    return JSON.stringify(arr);
  }

  private static decode(raw: string): Task[] {
    const result: Task[] = [];
    try {
      const arr = JSON.parse(raw) as TaskJson[];
      for (let i = 0; i < arr.length; i++) {
        result.push(Task.fromJson(arr[i]));
      }
    } catch (err) {
      return [];
    }
    return result;
  }
}
