from attendance_agent import AttendanceAgent


class SchoolAgent:
    """Level 1 agent that receives and delegates school requests."""

    ATTENDANCE_COMMANDS = {"mark attendance", "show attendance"}

    def __init__(self):
        self.attendance_agent = AttendanceAgent()

    def observe(self, request):
        """Receive a request from the user."""
        print(f"\nSchoolAgent observed: {request}")
        return request

    def plan(self, request):
        """Decide whether to act or delegate."""
        command = request[0].lower()

        if command == "greet":
            return "greet"
        if command in self.ATTENDANCE_COMMANDS:
            return "delegate_to_attendance_agent"
        if command == "stop":
            return "stop"
        return "unknown"

    def act(self, action, request):
        """Act directly or transfer responsibility."""
        if action == "greet":
            return "Welcome to Learn With Champak!"
        if action == "delegate_to_attendance_agent":
            print("SchoolAgent is transferring responsibility.")
            return self.attendance_agent.handle(request)
        if action == "stop":
            return "SchoolAgent stopped."
        return "SchoolAgent does not understand this request."

    def handle(self, request):
        """Complete the Level 1 agent cycle."""
        observed_request = self.observe(request)
        action = self.plan(observed_request)
        print(f"SchoolAgent planned: {action}")
        return self.act(action, observed_request)
