import { PortalCard } from "@/components/portal/portal-page";
import {
  DashboardPlaceholderGrid,
  DashboardProfileCard,
  DashboardTable,
  DashboardWelcomeCard,
  StatCard,
} from "@/components/portal/dashboard-ui";
import type { SchoolAdminDashboardData } from "@/lib/dashboard/school-admin-data";

type SchoolAdminDashboardProps = {
  data: SchoolAdminDashboardData;
};

export function SchoolAdminDashboard({ data }: SchoolAdminDashboardProps) {
  return (
    <div className="space-y-4">
      <DashboardWelcomeCard
        name={data.adminName}
        subtitle={`School admin dashboard for ${data.schoolName}.`}
      />

      <DashboardProfileCard
        fields={[
          { label: "Name", value: data.adminName },
          { label: "Email", value: data.adminEmail },
          { label: "Role", value: "School admin" },
          { label: "School", value: data.schoolName },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active cohorts" value={data.stats.activeCohorts} />
        <StatCard label="Students enrolled" value={data.stats.totalEnrolled} />
        <StatCard label="Teachers" value={data.stats.totalTeachers} />
        <StatCard label="Running cohorts" value={data.cohorts.length} />
      </div>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Cohorts at your school
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Cohort", "Enrolled", "Status"]}
            rows={data.cohorts.map((cohort) => [
              cohort.name,
              String(cohort.enrolledCount),
              cohort.isActive ? "Active" : "Inactive",
            ])}
            emptyMessage="No cohorts are set up for your school yet."
          />
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Students
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Name", "Email", "Class", "Age"]}
            rows={data.students.map((student) => [
              student.fullName,
              student.email ?? "—",
              student.cohortName ?? "—",
              student.age != null ? String(student.age) : "—",
            ])}
            emptyMessage="No approved students at your school yet."
          />
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Teachers
        </h2>
        <div className="mt-4">
          <DashboardTable
            headers={["Name", "Email"]}
            rows={data.teachers.map((teacher) => [
              teacher.fullName,
              teacher.email ?? "—",
            ])}
            emptyMessage="No approved teachers at your school yet."
          />
        </div>
      </PortalCard>

      <DashboardPlaceholderGrid
        items={[
          {
            title: "Grades & averages",
            description:
              "Student grades and class averages will appear here once grading is enabled for your school.",
          },
          {
            title: "Subject curriculum",
            description:
              "Subject curriculum and lesson plans for your cohorts will be listed here in a future update.",
          },
        ]}
      />
    </div>
  );
}
