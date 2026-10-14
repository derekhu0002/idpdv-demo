/**
 * 软件单元：entry/src/main/ets/components/TaskStats.ets
 * 进度统计组件（对应图谱：su-task-stats / le-task-stats-panel / imp-task-stats）。
 * 展示未完成 / 已完成 计数。
 */

@Component
export struct TaskStats {
  @Prop active: number;
  @Prop completed: number;

  build() {
    Row({ space: 12 }) {
      this.statCard('未完成', this.active, '#EF4444')
      this.statCard('已完成', this.completed, '#16A34A')
    }
    .width('100%')
  }

  @Builder
  statCard(label: string, value: number, color: string) {
    Column({ space: 4 }) {
      Text(value.toString())
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor(color)
      Text(label)
        .fontSize(12)
        .fontColor('#6B7280')
    }
    .layoutWeight(1)
    .padding(12)
    .backgroundColor(Color.White)
    .borderRadius(12)
  }
}
