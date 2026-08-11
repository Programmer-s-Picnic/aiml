class AttendanceAgent:
    """Level 2 agent responsible for student attendance."""

    def __init__(self):
        self.attendance = {}

    def observe(self, request):
        """Receive delegated work from SchoolAgent."""
        print(f"AttendanceAgent observed: {request}")
        return request

    def plan(self, request):
        """Decide which attendance action is required."""
        command = request[0].lower()

        if command == "mark attendance":
            return "mark"

        if command == "show attendance":
            return "show"

        return "unknown"

    def act(self, action, request):
        """Perform the attendance action."""
        if action == "mark":
            student_name = request[1]
            status = request[2]
            self.attendance[student_name] = status
            return f"Attendance saved: {student_name} is {status}."

        if action == "show":
            if not self.attendance:
                return "No attendance has been recorded."

            report = ["Attendance Report"]
            for student_name, status in self.attendance.items():
                report.append(f"{student_name}: {status}")
            return "\n".join(report)

        return "AttendanceAgent does not understand this request."

    def handle(self, request):
        """Complete the Observe -> Plan -> Act cycle."""
        observed_request = self.observe(request)
        action = self.plan(observed_request)
        print(f"AttendanceAgent planned: {action}")
        return self.act(action, observed_request)
