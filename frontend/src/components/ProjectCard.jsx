function ProjectCard({ project }) {
    return (
        <div className="bg-white p-5 mt-5 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">{project.name}</h3>

            <p className="text-gray-600 mb-2">{project.description}</p>

            <p className="text-sm text-gray-700">
                <strong>Status:</strong> {project.status}
            </p>

            <div className="mt-4">
                <button className="mr-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm transition">
                    View Tasks
                </button>

                <button className="mr-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition">
                    Edit
                </button>

                <button className="mr-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">
                    Delete
                </button>
            </div>
        </div>
    );
}

export default ProjectCard;