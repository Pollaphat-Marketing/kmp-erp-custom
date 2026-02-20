from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="kmp_erp_custom",
    version="0.1.0",
    description="KMP ERP Custom App - Custom modules, KMP Assistant, integrations",
    author="Pollaphat Marketing",
    author_email="chart@pollaphat.co.th",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
