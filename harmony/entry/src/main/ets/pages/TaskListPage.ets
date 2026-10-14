/**
 * 软件单元：entry/src/main/ets/pages/TaskListPage.ets
 * 待办列表页面（对应图谱：su-task-list-page / le-task-list-page / imp-task-list-page）。
 * 承载列表渲染、筛选切换、新增/编辑面板与会话级交互，业务逻辑委托 TaskListViewModel。
 */

import { Task } from '../model/Task';
import { TaskFilter, TaskListViewModel } from '../viewmodel/TaskListViewModel';
import { TaskStats } from '../components/TaskStats';

@Component
export struct TaskListPage {
  @State tasks: Task[] = [];
  @State filter: string = TaskFilter.ALL;
  @State activeTotal: number = 0;
  @State completedTotal: number = 0;
  @State editorVisible: boolean = false;
  @State editingId: string = '';
  @State draftTitle: string = '';
  @State draftDescription: string = '';
  @State errorMessage: string = '';

  private vm: TaskListViewModel = new TaskListViewModel();

  aboutToAppear(): void {
    this.vm.load().then(() => {
      this.syncFromViewModel();
    });
  }

  private syncFromViewModel(): void {
    this.tasks = this.vm.getVisibleTasks();
    this.filter = this.vm.getFilter();
    this.activeTotal = this.vm.getActiveCount();
    this.completedTotal = this.vm.getCompletedCount();
  }

  private applyFilter(filterKey: string): void {
    this.vm.setFilter(filterKey);
    this.syncFromViewModel();
  }

  private openCreate(): void {
    this.editingId = '';
    this.draftTitle = '';
    this.draftDescription = '';
    this.errorMessage = '';
    this.editorVisible = true;
  }

  private openEdit(task: Task): void {
    this.editingId = task.id;
    this.draftTitle = task.title;
    this.draftDescription = task.description;
    this.errorMessage = '';
    this.editorVisible = true;
  }

  private closeEditor(): void {
    this.editorVisible = false;
    this.errorMessage = '';
  }

  private saveDraft(): void {
    const title: string = this.draftTitle.trim();
    const description: string = this.draftDescription.trim();
    if (title.length === 0 || description.length === 0) {
      this.errorMessage = '标题与描述均不能为空';
      return;
    }
    if (this.editingId.length === 0) {
      this.vm.addTask(title, description);
    } else {
      this.vm.updateTask(this.editingId, title, description);
    }
    this.vm.persist().then(() => {
      this.editorVisible = false;
      this.syncFromViewModel();
    });
  }

  private toggle(task: Task): void {
    this.vm.toggleTask(task.id);
    this.vm.persist().then(() => {
      this.syncFromViewModel();
    });
  }

  private remove(id: string): void {
    this.vm.removeTask(id);
    this.vm.persist().then(() => {
      this.syncFromViewModel();
    });
  }

  build() {
    Column({ space: 12 }) {
      Row() {
        Text('待办事项')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1F2937')
        Blank()
        Button('新增')
          .backgroundColor('#2563EB')
          .onClick(() => {
            this.openCreate();
          })
      }
      .width('100%')

      TaskStats({ active: this.activeTotal, completed: this.completedTotal })

      Row({ space: 8 }) {
        this.filterButton('全部', TaskFilter.ALL)
        this.filterButton('未完成', TaskFilter.ACTIVE)
        this.filterButton('已完成', TaskFilter.COMPLETED)
      }
      .width('100%')

      if (this.editorVisible) {
        this.editorPanel()
      }

      if (this.tasks.length === 0) {
        Column() {
          Text('暂无待办任务')
            .fontSize(16)
            .fontColor('#9CA3AF')
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 8 }) {
          ForEach(this.tasks, (item: Task) => {
            ListItem() {
              this.taskRow(item)
            }
          }, (item: Task) => item.id + '-' + item.completed.toString())
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .backgroundColor('#F3F4F6')
  }

  @Builder
  filterButton(label: string, filterKey: string) {
    Button(label)
      .fontSize(14)
      .backgroundColor(this.filter === filterKey ? '#2563EB' : '#E5E7EB')
      .fontColor(this.filter === filterKey ? Color.White : '#374151')
      .onClick(() => {
        this.applyFilter(filterKey);
      })
  }

  @Builder
  editorPanel() {
    Column({ space: 8 }) {
      Text(this.editingId.length === 0 ? '新增待办' : '编辑待办')
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .width('100%')
      TextInput({ text: this.draftTitle, placeholder: '标题' })
        .onChange((value: string) => {
          this.draftTitle = value;
        })
      TextArea({ text: this.draftDescription, placeholder: '描述' })
        .height(72)
        .onChange((value: string) => {
          this.draftDescription = value;
        })
      if (this.errorMessage.length > 0) {
        Text(this.errorMessage)
          .fontSize(12)
          .fontColor('#DC2626')
          .width('100%')
      }
      Row({ space: 8 }) {
        Button('保存')
          .backgroundColor('#2563EB')
          .onClick(() => {
            this.saveDraft();
          })
        Button('取消')
          .backgroundColor('#9CA3AF')
          .onClick(() => {
            this.closeEditor();
          })
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
    }
    .width('100%')
    .padding(12)
    .backgroundColor(Color.White)
    .borderRadius(12)
  }

  @Builder
  taskRow(task: Task) {
    Row({ space: 10 }) {
      Checkbox()
        .select(task.completed)
        .onChange((value: boolean) => {
          this.toggle(task);
        })
      Column({ space: 2 }) {
        Text(task.title)
          .fontSize(16)
          .fontColor(task.completed ? '#9CA3AF' : '#111827')
          .decoration({ type: task.completed ? TextDecorationType.LineThrough : TextDecorationType.None })
        Text(task.description)
          .fontSize(12)
          .fontColor('#6B7280')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)
      Button('编辑')
        .fontSize(12)
        .backgroundColor('#E5E7EB')
        .fontColor('#374151')
        .onClick(() => {
          this.openEdit(task);
        })
      Button('删除')
        .fontSize(12)
        .backgroundColor('#FEE2E2')
        .fontColor('#B91C1C')
        .onClick(() => {
          this.remove(task.id);
        })
    }
    .width('100%')
    .padding(12)
    .backgroundColor(Color.White)
    .borderRadius(12)
  }
}
